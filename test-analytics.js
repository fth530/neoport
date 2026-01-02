const http = require('http');
const assert = require('assert');
const chartUtils = require('./utils/charts');
const analyticsUtils = require('./utils/analytics');

console.log('🧪 Starting Analytics Tests...');

// 1. Unit Tests
console.log('\n[1] Testing Utility Functions...');

// Test Candlestick Generator
try {
    const ohlc = chartUtils.getCandlestickData('TEST', 10);
    assert.strictEqual(ohlc.length, 10, 'Should generate 10 days of data');
    assert.ok(ohlc[0].o && ohlc[0].h && ohlc[0].l && ohlc[0].c, 'Should have OHLC properties');
    console.log('✅ getCandlestickData passed');
} catch (e) {
    console.error('❌ getCandlestickData failed:', e.message);
    process.exit(1);
}

// Test SMA
try {
    const prices = [10, 20, 30, 40, 50];
    const sma = chartUtils.calculateSMA(prices, 3);
    // SMA of [10,20,30] = 20
    // SMA of [20,30,40] = 30
    // SMA of [30,40,50] = 40
    assert.strictEqual(sma[2], 20, 'First SMA value incorrect');
    assert.strictEqual(sma[4], 40, 'Last SMA value incorrect');
    console.log('✅ calculateSMA passed');
} catch (e) {
    console.error('❌ calculateSMA failed:', e.message);
    process.exit(1);
}

// Test Risk metrics
try {
    const result = analyticsUtils.calculatePortfolioRisk([]);
    assert.ok(result.volatility, 'Volatility missing');
    assert.ok(result.sharpeRatio, 'Sharpe Ratio missing');
    console.log('✅ calculatePortfolioRisk passed');
} catch (e) {
    console.error('❌ calculatePortfolioRisk failed:', e.message);
    process.exit(1);
}

// 2. Integration Tests (API)
console.log('\n[2] Testing API Endpoints...');

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const req = http.get({
            hostname: 'localhost',
            port: 3000,
            path: path
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function runApiTests() {
    try {
        // Test Candlestick API
        const chartRes = await makeRequest('/api/v1/charts/candlestick/TEST?days=5');
        assert.strictEqual(chartRes.statusCode, 200, 'Chart API status not 200');
        assert.strictEqual(chartRes.body.length, 5, 'Chart API returned wrong length');
        console.log('✅ GET /api/v1/charts/candlestick passed');

        // Test Risk API
        const riskRes = await makeRequest('/api/v1/analytics/risk');
        assert.strictEqual(riskRes.statusCode, 200, 'Risk API status not 200');
        assert.ok(riskRes.body.riskScore, 'Risk API Body check');
        console.log('✅ GET /api/v1/analytics/risk passed');

        console.log('\nð All Analytics Tests Passed!');
        process.exit(0);

    } catch (e) {
        if (e.code === 'ECONNREFUSED') {
            console.error('❌ Server is not running. Please start the server to run API tests.');
            // We consider Unit tests pass enough for "Code" verification, but fail full suite.
            // But since this is an automated step, I should try to make it resilient.
            // I'll fail here so I know I need to start server.
            process.exit(1);
        }
        console.error('❌ API Test failed:', e);
        process.exit(1);
    }
}

runApiTests();
