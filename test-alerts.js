const axios = require('axios');
const assert = require('assert');
const { checkPriceAlerts } = require('./utils/alertEngine');
const { detectPortfolioChanges } = require('./utils/portfolioMonitor');

// Mock Database for Unit Tests
global.mockAlerts = [
    { id: 1, asset_symbol: 'BTC', alert_type: 'PRICE_ABOVE', threshold_value: 100000, is_active: 1 },
    { id: 2, asset_symbol: 'ETH', alert_type: 'PRICE_BELOW', threshold_value: 2000, is_active: 1 }
];

// Mock database module interception would be complex here without rewiring.
// Instead we will test the LOGIC functions directly and API endpoints via axios if server running.
// Since we can't easily rely on running server for unit-like logic, we will test logic pure functions.
// But checkPriceAlerts imports 'database'. We need to mock it if we run this node script standalone.

// LET'S TEST API INTEGRATION (Assuming server is running from previous steps)
// We will also test pure logic functions by mocking.

const API_URL = 'http://localhost:3001/api/v1';

async function runTests() {
    console.log('🔔 Starting Alert System Tests...');
    let passed = 0;
    let failed = 0;

    // 1. UNIT TEST: Portfolio Monitor
    try {
        console.log('\n🧪 Testing Portfolio Monitor...');
        const change = detectPortfolioChanges(1000, 1150); // 15% increase
        assert(change !== null, 'Should detect 15% increase');
        assert(change.type === 'PORTFOLIO_VOLATILITY', 'Type mismatch');
        assert(change.percent === '15.00', 'Percent calc wrong');
        console.log('✅ Volatility detection passed');
        passed++;
    } catch (e) {
        console.error('❌ Volatility test failed:', e.message);
        failed++;
    }

    // 2. INTEGRATION TEST: Alert API
    // (Requires server to be running. If not, this might fail, but we'll try)
    try {
        console.log('\n🧪 Testing Alerts API...');

        // Create Alert
        const newAlert = {
            symbol: 'TEST_COIN',
            type: 'PRICE_ABOVE',
            threshold: 50.0,
            currentPrice: 40.0
        };

        const createRes = await axios.post(`${API_URL}/alerts`, newAlert);
        assert(createRes.status === 201, 'Create alert status not 201');
        const alertId = createRes.data.id;
        console.log('✅ Alert creation passed');

        // Get Alerts
        const getRes = await axios.get(`${API_URL}/alerts`);
        const created = getRes.data.find(a => a.id === alertId);
        assert(created, 'Created alert not found in list');
        assert(created.asset_symbol === 'TEST_COIN', 'Symbol mismatch');
        console.log('✅ Get alerts passed');

        // Delete Alert
        const delRes = await axios.delete(`${API_URL}/alerts/${alertId}`);
        assert(delRes.data.success === true, 'Delete failed');
        console.log('✅ Delete alert passed');

        passed++;
    } catch (e) {
        console.error('❌ API Integration failed (Server might be down):', e.message);
        // We won't count as fail if it's connection refused, just warn
        if (e.code === 'ECONNREFUSED') {
            console.warn('⚠️ Server not running, skipping API tests.');
        } else {
            failed++;
        }
    }

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
}

runTests();
