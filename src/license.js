// License Key System
// Generate keys with expiry dates for rental access

import crypto from 'crypto';

// Secret salt - CHANGE THIS to your own secret!
const SECRET = 'const SECRET = 'polymarket-arb-bot-2026-secret-key';

/**
 * Generate a license key for a given expiry date
 * @param {string} expiryDate - Format: YYYY-MM-DD
 * @returns {string} License key
 * 
 * Usage: node -e "import('./src/license.js').then(m => console.log(m.generate('2026-01-16')))"
 */
export function generate(expiryDate) {
    const hash = crypto
        .createHash('sha256')
        .update(expiryDate + SECRET)
        .digest('hex')
        .slice(0, 16)
        .toUpperCase();

    return `${expiryDate}-${hash}`;
}

/**
 * Validate a license key
 * @param {string} licenseKey - The license key to validate
 * @returns {{ valid: boolean, expiresAt: Date|null, daysLeft: number }}
 */
export function validate(licenseKey) {
    if (!licenseKey) {
        return { valid: false, expiresAt: null, daysLeft: 0, error: 'No license key provided' };
    }

    // Parse key: YYYY-MM-DD-HASH
    const parts = licenseKey.split('-');
    if (parts.length !== 4) {
        return { valid: false, expiresAt: null, daysLeft: 0, error: 'Invalid key format' };
    }

    const expiry = `${parts[0]}-${parts[1]}-${parts[2]}`;
    const hash = parts[3];

    // Verify hash
    const expectedHash = crypto
        .createHash('sha256')
        .update(expiry + SECRET)
        .digest('hex')
        .slice(0, 16)
        .toUpperCase();

    if (hash !== expectedHash) {
        return { valid: false, expiresAt: null, daysLeft: 0, error: 'Invalid license key' };
    }

    // Check expiry
    const expiresAt = new Date(expiry + 'T23:59:59Z');
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    if (now > expiresAt) {
        return { valid: false, expiresAt, daysLeft: 0, error: 'License expired' };
    }

    return { valid: true, expiresAt, daysLeft };
}

/**
 * Check license on startup and exit if invalid
 * @param {string} licenseKey - License key from env var
 */
export function checkLicense(licenseKey) {
    console.log('🔑 Checking license...');

    const result = validate(licenseKey);

    if (!result.valid) {
        console.error(`❌ LICENSE ERROR: ${result.error}`);
        console.error('   Please contact the owner to obtain a valid license.');
        process.exit(1);
    }

    console.log(`✅ License valid until: ${result.expiresAt.toISOString().split('T')[0]}`);
    console.log(`   Days remaining: ${result.daysLeft}`);

    if (result.daysLeft <= 3) {
        console.warn(`⚠️  WARNING: License expires in ${result.daysLeft} day(s)!`);
    }

    return result;
}

// CLI: Generate license key
// Run: node src/license.js generate 2026-01-16
if (process.argv[2] === 'generate' && process.argv[3]) {
    const key = generate(process.argv[3]);
    console.log('\n🔑 Generated License Key:');
    console.log('========================');
    console.log(key);
    console.log('========================');
    console.log(`\nExpires: ${process.argv[3]}`);
    console.log('\nSet in Railway/env:');
    console.log(`LICENSE_KEY=${key}`);
}
