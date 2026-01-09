// Polymarket CLOB API Authentication Module
// L2 HMAC-SHA256 Authentication per Polymarket CLOB docs
// Env vars: CLOB_API_URL, CLOB_API_KEY, CLOB_SECRET, CLOB_PASS_PHRASE

import crypto from 'crypto';

// Environment variables (loaded at runtime)
// REQUIRED: Set these in .env or Railway environment
const getConfig = () => ({
    apiUrl: process.env.CLOB_API_URL || 'https://clob.polymarket.com',
    apiKey: process.env.CLOB_API_KEY || '',
    secret: process.env.CLOB_SECRET || '',
    passphrase: process.env.CLOB_PASS_PHRASE || '',
    walletAddress: process.env.POLY_ADDRESS || ''
});

/**
 * Generate HMAC-SHA256 signature for Polymarket CLOB API
 * Per Polymarket L2 authentication docs
 * 
 * @param {string} secret - API secret
 * @param {string} timestamp - Unix timestamp in seconds
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - API endpoint path
 * @param {string} body - Request body (empty string for GET)
 * @returns {string} Base64-encoded HMAC-SHA256 signature
 */
function generateSignature(secret, timestamp, method, path, body = '') {
    // Message format: timestamp + method + path + body
    const message = timestamp + method.toUpperCase() + path + body;

    // Convert URL-safe base64 secret to standard base64 for decoding
    const standardBase64Secret = secret.replace(/-/g, '+').replace(/_/g, '/');

    // HMAC-SHA256 with base64 encoding
    const hmac = crypto.createHmac('sha256', Buffer.from(standardBase64Secret, 'base64'));
    hmac.update(message);
    const sig = hmac.digest('base64');

    // URL-safe base64: replace + with -, / with _ (per Polymarket spec)
    return sig.replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Generate authentication headers for Polymarket CLOB API
 * 
 * @param {string} method - HTTP method
 * @param {string} path - API endpoint path (e.g., '/order')
 * @param {string} body - Request body as string
 * @returns {Object} Headers object with auth credentials
 */
export function generateAuthHeaders(method, path, body = '') {
    const config = getConfig();

    // Validate credentials
    if (!config.apiKey || !config.secret || !config.passphrase) {
        throw new Error('Missing CLOB API credentials. Set CLOB_API_KEY, CLOB_SECRET, CLOB_PASS_PHRASE env vars.');
    }

    // Unix timestamp in seconds
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Generate signature
    const signature = generateSignature(config.secret, timestamp, method, path, body);

    return {
        'Content-Type': 'application/json',
        'POLY_ADDRESS': config.walletAddress,
        'POLY_API_KEY': config.apiKey,
        'POLY_SIGNATURE': signature,
        'POLY_TIMESTAMP': timestamp,
        'POLY_PASSPHRASE': config.passphrase
    };
}

/**
 * Get the configured API base URL
 * @returns {string} Base URL for CLOB API
 */
export function getApiUrl() {
    return getConfig().apiUrl;
}

/**
 * Test authentication by calling a cheap authenticated endpoint
 * Uses POST /balance - a lightweight endpoint to verify signing
 * 
 * @returns {Promise<{success: boolean, message: string, latency: number}>}
 */
export async function testAuth() {
    const startTime = performance.now();

    try {
        const config = getConfig();
        const path = '/auth/api-keys';  // Documented auth verification endpoint
        const method = 'GET';

        const headers = generateAuthHeaders(method, path, '');

        // Log headers for debugging
        console.log('\n📋 Request Headers:');
        console.log(`  URL: ${config.apiUrl}${path}`);
        console.log(`  Method: ${method}`);
        Object.entries(headers).forEach(([key, value]) => {
            // Mask sensitive values
            const display = key === 'POLY-API-KEY' ? value.slice(0, 8) + '...' :
                key === 'POLY-PASSPHRASE' ? value.slice(0, 8) + '...' : value;
            console.log(`  ${key}: ${display}`);
        });
        console.log('');

        const response = await fetch(`${config.apiUrl}${path}`, {
            method,
            headers
        });

        const latency = performance.now() - startTime;
        const responseText = await response.text();

        // Log response details
        console.log(`📥 Response: ${response.status} ${response.statusText}`);
        console.log(`📝 Body: ${responseText.slice(0, 500)}`);

        if (response.ok) {
            console.log(`\n✅ Auth test PASSED (${latency.toFixed(2)}ms)`);
            return {
                success: true,
                message: 'Authentication successful',
                latency,
                status: response.status,
                data: responseText
            };
        } else {
            console.error(`\n❌ Auth test FAILED: ${response.status}`);
            return {
                success: false,
                message: `Authentication failed: ${response.status}`,
                latency,
                status: response.status,
                error: responseText
            };
        }

    } catch (error) {
        const latency = performance.now() - startTime;
        console.error(`❌ Auth test ERROR: ${error.message}`);
        return {
            success: false,
            message: error.message,
            latency,
            error: error.toString()
        };
    }
}

/**
 * Validate that credentials are configured
 * @returns {boolean} True if all credentials are set
 */
export function hasCredentials() {
    const config = getConfig();
    return !!(config.apiKey && config.secret && config.passphrase);
}

/**
 * Create signed request options for fetch
 * Convenience wrapper for authenticated API calls
 * 
 * @param {string} method - HTTP method
 * @param {string} path - API endpoint path
 * @param {Object} body - Request body (will be JSON stringified)
 * @returns {Object} Fetch options with auth headers
 */
export function createSignedRequest(method, path, body = null) {
    const bodyString = body ? JSON.stringify(body) : '';
    const headers = generateAuthHeaders(method, path, bodyString);

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = bodyString;
    }

    return options;
}

export default {
    generateAuthHeaders,
    generateSignature,
    testAuth,
    hasCredentials,
    createSignedRequest,
    getApiUrl
};
