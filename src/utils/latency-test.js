// Latency Test Utility
// Validates network latency to Polymarket
// MANDATORY: Exit if >80ms (DESCRIPTION.md L130-161)

import fetch from 'node-fetch';
import { DEPLOYMENT, API } from '../config.js';

console.log('🌐 LATENCY TEST - Polymarket Connection\n');
console.log(`Target: <${DEPLOYMENT.MAX_LATENCY}ms to Polymarket`);
console.log(`Ideal: <${DEPLOYMENT.TARGET_LATENCY}ms (EU-West to London)\n`);

async function testLatency() {
    const results = [];
    const TESTS = 10;

    console.log(`Running ${TESTS} latency tests...\n`);

    for (let i = 0; i < TESTS; i++) {
        const start = Date.now();

        try {
            const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.PING}`, {
                method: 'GET',
                timeout: 5000
            });

            const latency = Date.now() - start;
            results.push(latency);

            console.log(`Test ${i + 1}/${TESTS}: ${latency}ms`);

        } catch (error) {
            console.log(`Test ${i + 1}/${TESTS}: FAILED (${error.message})`);
            results.push(null);
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 RESULTS:\n');

    const validResults = results.filter(r => r !== null);

    if (validResults.length === 0) {
        console.log('❌ All tests failed - cannot determine latency');
        console.log('⚠️ Check network connection or API endpoint');
        process.exit(1);
    }

    const min = Math.min(...validResults);
    const max = Math.max(...validResults);
    const avg = validResults.reduce((a, b) => a + b, 0) / validResults.length;
    const sorted = validResults.slice().sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    console.log(`Min:     ${min}ms`);
    console.log(`Average: ${avg.toFixed(2)}ms`);
    console.log(`p95:     ${p95}ms`);
    console.log(`Max:     ${max}ms`);
    console.log(`Success: ${validResults.length}/${TESTS}\n`);

    // Validation
    const targetMet = p95 < DEPLOYMENT.MAX_LATENCY;
    const idealMet = p95 < DEPLOYMENT.TARGET_LATENCY;

    console.log('🎯 VALIDATION:\n');
    console.log(`p95 latency: ${p95}ms`);
    console.log(`Max allowed: ${DEPLOYMENT.MAX_LATENCY}ms`);
    console.log(`Status: ${targetMet ? '✅ PASS' : '❌ FAIL'}\n`);

    if (idealMet) {
        console.log('✨ EXCELLENT: Latency is optimal for EU-West deployment');
    } else if (targetMet) {
        console.log('✅ ACCEPTABLE: Latency meets requirements but not optimal');
    } else {
        console.log('❌ CRITICAL: Latency too high!');
        console.log('\nRecommendations:');

        if (p95 > 150) {
            console.log('   → Deploy to Railway EU-West (Amsterdam)');
            console.log('   → Current location likely US or Asia-Pacific');
        } else if (p95 > 80) {
            console.log('   → Check network connection quality');
            console.log('   → Consider EU-West deployment for optimization');
        }
    }

    console.log('');

    // Exit with error code if latency too high (MANDATORY)
    if (!targetMet) {
        console.error('❌ EXITING: Latency exceeds maximum threshold');
        console.error('   Bot cannot achieve target capture rate with this latency');
        console.error('   Deploy to EU-West region or check network connection\n');
        process.exit(1);
    }

    console.log('✅ Latency test PASSED - safe to deploy\n');
    return p95;
}

// Run test if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    await testLatency();
}

export default testLatency;
