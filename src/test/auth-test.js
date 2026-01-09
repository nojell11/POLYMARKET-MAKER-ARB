// Auth Test Script
// Verify Polymarket CLOB authentication before deployment

import { testAuth, hasCredentials } from '../auth/polymarket.js';

console.log('🔐 POLYMARKET CLOB AUTHENTICATION TEST\n');

// Check if credentials are configured
if (!hasCredentials()) {
    console.error('❌ Missing credentials!');
    console.error('');
    console.error('Set the following environment variables:');
    console.error('  CLOB_API_KEY=your_api_key');
    console.error('  CLOB_SECRET=your_secret');
    console.error('  CLOB_PASS_PHRASE=your_passphrase');
    console.error('');
    console.error('Get credentials from: https://polymarket.com/settings/api');
    process.exit(1);
}

console.log('✅ Credentials configured');
console.log('📡 Testing authentication...\n');

// Run auth test
const result = await testAuth();

console.log('\n📊 Results:');
console.log(`  Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
console.log(`  Latency: ${result.latency.toFixed(2)}ms`);
console.log(`  Message: ${result.message}`);

if (result.error) {
    console.log(`  Error: ${result.error}`);
}

console.log('\n');

// Exit with appropriate code
process.exit(result.success ? 0 : 1);
