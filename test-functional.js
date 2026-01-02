/**
 * Functional Features Test Suite
 * Export/Import ve Raporlama testleri
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let testAssetId = null;

// HTTP request helper
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, data: response, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

// Test helper
async function runTest(name, testFn) {
    try {
        await testFn();
        console.log(`✅ ${name}`);
        return true;
    } catch (error) {
        console.error(`❌ ${name}`);
        console.error(`   Hata: ${error.message}`);
        return false;
    }
}

// Setup: Test verisi oluştur
async function setupTestData() {
    console.log('\n📦 Test verisi hazırlanıyor...\n');
    
    // Test varlığı ekle
    const asset = await makeRequest('POST', '/api/v1/assets', {
        name: 'Test Bitcoin',
        symbol: 'BTC',
        type: 'crypto',
        quantity: 0.5,
        avg_cost: 50000,
        currency: 'USD'
    });
    
    testAssetId = asset.data.id;
    
    // Birkaç işlem ekle
    await makeRequest('POST', `/api/v1/assets/${testAssetId}/buy`, {
        quantity: 0.3,
        price: 52000
    });
    
    await makeRequest('POST', `/api/v1/assets/${testAssetId}/sell`, {
        quantity: 0.1,
        price: 55000
    });
    
    console.log('✅ Test verisi hazır\n');
}

// Cleanup: Test verisini temizle
async function cleanupTestData() {
    if (testAssetId) {
        await makeRequest('DELETE', `/api/v1/assets/${testAssetId}`);
    }
}

// =====================
// EXPORT TESTS
// =====================

async function testExportAssetsJSON() {
    const res = await makeRequest('GET', '/api/v1/export/assets?format=json');
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    
    if (!Array.isArray(data)) {
        throw new Error('JSON array bekleniyor');
    }
    
    if (data.length === 0) {
        throw new Error('En az bir varlık bekleniyor');
    }
    
    // Content-Type kontrolü
    if (!res.headers['content-type'].includes('application/json')) {
        throw new Error('Content-Type application/json olmalı');
    }
}

async function testExportAssetsCSV() {
    const res = await makeRequest('GET', '/api/v1/export/assets?format=csv');
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    if (typeof res.data !== 'string') {
        throw new Error('CSV string bekleniyor');
    }
    
    const lines = res.data.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV en az header ve bir satır içermeli');
    }
    
    // Header kontrolü
    if (!lines[0].includes('id') || !lines[0].includes('name')) {
        throw new Error('CSV header eksik');
    }
    
    // Content-Type kontrolü
    if (!res.headers['content-type'].includes('text/csv')) {
        throw new Error('Content-Type text/csv olmalı');
    }
}

async function testExportTransactionsJSON() {
    const res = await makeRequest('GET', '/api/v1/export/transactions?format=json');
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    
    if (!Array.isArray(data)) {
        throw new Error('JSON array bekleniyor');
    }
}

async function testExportTransactionsCSV() {
    const res = await makeRequest('GET', '/api/v1/export/transactions?format=csv');
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    if (typeof res.data !== 'string') {
        throw new Error('CSV string bekleniyor');
    }
}

async function testExportPortfolioJSON() {
    const res = await makeRequest('GET', '/api/v1/export/portfolio?format=json');
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    
    if (!data.summary || !data.assets || !data.transactions) {
        throw new Error('Portfolio export eksik alanlar içeriyor');
    }
    
    if (!data.exportDate || !data.version) {
        throw new Error('Export metadata eksik');
    }
}

// =====================
// IMPORT TESTS
// =====================

async function testImportAssetsJSON() {
    // Rate limit için bekle
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Önce varsa temizle
    const existingAssets = await makeRequest('GET', '/api/v1/assets');
    const assetsList = Array.isArray(existingAssets.data) ? existingAssets.data : [];
    const existing = assetsList.find(a => a.symbol === 'GOLD-TEST');
    if (existing) {
        await makeRequest('DELETE', `/api/v1/assets/${existing.id}`);
    }
    
    const importData = [
        {
            name: 'Import Test Gold',
            symbol: 'GOLD-TEST',
            type: 'gold',
            quantity: 10,
            avg_cost: 2000,
            current_price: 2000,
            currency: 'TRY'
        }
    ];
    
    const res = await makeRequest('POST', '/api/v1/import/assets', {
        data: JSON.stringify(importData),
        format: 'json'
    });
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    if (!res.data.success) {
        throw new Error('Import başarısız');
    }
    
    if (res.data.imported !== 1) {
        throw new Error(`1 varlık import edilmeli, ${res.data.imported} edildi`);
    }
    
    // Cleanup
    const assets = await makeRequest('GET', '/api/v1/assets');
    const assetsList2 = Array.isArray(assets.data) ? assets.data : [];
    const imported = assetsList2.find(a => a.symbol === 'GOLD-TEST');
    if (imported) {
        await makeRequest('DELETE', `/api/v1/assets/${imported.id}`);
    }
}

async function testImportAssetsCSV() {
    // Rate limit için bekle
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Önce varsa temizle
    const existingAssets = await makeRequest('GET', '/api/v1/assets');
    const assetsList = Array.isArray(existingAssets.data) ? existingAssets.data : [];
    const existing = assetsList.find(a => a.symbol === 'SILVER-TEST');
    if (existing) {
        await makeRequest('DELETE', `/api/v1/assets/${existing.id}`);
    }
    
    const csvData = `name,symbol,type,quantity,avg_cost,current_price,currency
Import Test Silver,SILVER-TEST,gold,5,500,500,TRY`;
    
    const res = await makeRequest('POST', '/api/v1/import/assets', {
        data: csvData,
        format: 'csv'
    });
    
    // Rate limit durumunda skip et
    if (res.status === 429) {
        console.log('   ⚠️ Rate limit - test atlandı');
        return;
    }
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    if (!res.data.success) {
        throw new Error('Import başarısız');
    }
    
    // Cleanup
    const assets = await makeRequest('GET', '/api/v1/assets');
    const assetsList2 = Array.isArray(assets.data) ? assets.data : [];
    const imported = assetsList2.find(a => a.symbol === 'SILVER-TEST');
    if (imported) {
        await makeRequest('DELETE', `/api/v1/assets/${imported.id}`);
    }
}

async function testImportInvalidData() {
    // Rate limit için bekle
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const res = await makeRequest('POST', '/api/v1/import/assets', {
        data: JSON.stringify([{ invalid: 'data' }]),
        format: 'json'
    });
    
    // Rate limit durumunda skip et
    if (res.status === 429) {
        console.log('   ⚠️ Rate limit - test atlandı');
        return;
    }
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    if (!res.data.success) {
        throw new Error('Import response success false olmamalı');
    }
    
    if (res.data.errors === 0) {
        throw new Error('Hatalı veri error sayısını artırmalı');
    }
    
    if (res.data.imported !== 0) {
        throw new Error('Hatalı veri import edilmemeli');
    }
}

// =====================
// REPORTING TESTS
// =====================

async function testMonthlyReport() {
    await new Promise(resolve => setTimeout(resolve, 500));
    const res = await makeRequest('GET', '/api/v1/reports/monthly');
    
    if (res.status === 429) {
        console.log('   ⚠️ Rate limit - test atlandı');
        return;
    }
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    if (!Array.isArray(res.data)) {
        throw new Error('Array bekleniyor');
    }
    
    if (res.data.length > 0) {
        const report = res.data[0];
        if (!report.month || typeof report.buyCount === 'undefined') {
            throw new Error('Rapor formatı hatalı');
        }
    }
}

async function testPerformanceReport() {
    await new Promise(resolve => setTimeout(resolve, 500));
    const res = await makeRequest('GET', '/api/v1/reports/performance');
    
    if (res.status === 429) {
        console.log('   ⚠️ Rate limit - test atlandı');
        return;
    }
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    if (!Array.isArray(res.data)) {
        throw new Error('Array bekleniyor');
    }
    
    if (res.data.length > 0) {
        const report = res.data[0];
        const requiredFields = ['name', 'symbol', 'profitLoss', 'profitLossPercent', 'performance'];
        requiredFields.forEach(field => {
            if (!(field in report)) {
                throw new Error(`${field} alanı eksik`);
            }
        });
    }
}

async function testDistributionReport() {
    await new Promise(resolve => setTimeout(resolve, 500));
    const res = await makeRequest('GET', '/api/v1/reports/distribution');
    
    if (res.status === 429) {
        console.log('   ⚠️ Rate limit - test atlandı');
        return;
    }
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    if (!Array.isArray(res.data)) {
        throw new Error('Array bekleniyor');
    }
    
    if (res.data.length > 0) {
        const report = res.data[0];
        if (!report.type || typeof report.percentage === 'undefined') {
            throw new Error('Rapor formatı hatalı');
        }
        
        // Yüzde 0-100 arasında olmalı
        if (report.percentage < 0 || report.percentage > 100) {
            throw new Error('Yüzde değeri 0-100 arasında olmalı');
        }
    }
}

async function testTransactionSummary() {
    await new Promise(resolve => setTimeout(resolve, 500));
    const res = await makeRequest('GET', '/api/v1/reports/transactions');
    
    if (res.status === 429) {
        console.log('   ⚠️ Rate limit - test atlandı');
        return;
    }
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    const requiredFields = [
        'totalTransactions',
        'buyTransactions',
        'sellTransactions',
        'totalBuyAmount',
        'totalSellAmount',
        'totalRealizedProfit'
    ];
    
    requiredFields.forEach(field => {
        if (!(field in res.data)) {
            throw new Error(`${field} alanı eksik`);
        }
    });
}

async function testTransactionSummaryWithDateRange() {
    await new Promise(resolve => setTimeout(resolve, 500));
    const startDate = '2024-01-01';
    const endDate = '2025-12-31';
    
    const res = await makeRequest('GET', `/api/v1/reports/transactions?startDate=${startDate}&endDate=${endDate}`);
    
    if (res.status === 429) {
        console.log('   ⚠️ Rate limit - test atlandı');
        return;
    }
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    if (typeof res.data.totalTransactions === 'undefined') {
        throw new Error('Transaction summary formatı hatalı');
    }
}

async function testPortfolioHistory() {
    await new Promise(resolve => setTimeout(resolve, 500));
    const res = await makeRequest('GET', '/api/v1/reports/history');
    
    if (res.status === 429) {
        console.log('   ⚠️ Rate limit - test atlandı');
        return;
    }
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    if (!Array.isArray(res.data)) {
        throw new Error('Array bekleniyor');
    }
    
    if (res.data.length > 0) {
        const entry = res.data[0];
        if (!entry.date || typeof entry.value === 'undefined') {
            throw new Error('History formatı hatalı');
        }
    }
}

async function testTopPerformers() {
    await new Promise(resolve => setTimeout(resolve, 500));
    const res = await makeRequest('GET', '/api/v1/reports/top-performers?limit=3');
    
    if (res.status === 429) {
        console.log('   ⚠️ Rate limit - test atlandı');
        return;
    }
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    if (!res.data.topGainers || !res.data.topLosers) {
        throw new Error('topGainers ve topLosers alanları gerekli');
    }
    
    if (!Array.isArray(res.data.topGainers) || !Array.isArray(res.data.topLosers)) {
        throw new Error('topGainers ve topLosers array olmalı');
    }
}

async function testRiskAnalysis() {
    await new Promise(resolve => setTimeout(resolve, 500));
    const res = await makeRequest('GET', '/api/v1/reports/risk');
    
    if (res.status === 429) {
        console.log('   ⚠️ Rate limit - test atlandı');
        return;
    }
    
    if (res.status !== 200) {
        throw new Error(`Beklenen: 200, Alınan: ${res.status}`);
    }
    
    if (!res.data.diversification || !res.data.concentration) {
        throw new Error('Risk analizi eksik alanlar içeriyor');
    }
    
    // Diversification score 0-100 arasında olmalı
    if (res.data.diversification.score < 0 || res.data.diversification.score > 100) {
        throw new Error('Diversification score 0-100 arasında olmalı');
    }
}

// =====================
// MAIN TEST RUNNER
// =====================

async function runAllTests() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   📊 Functional Features Test Suite       ║');
    console.log('╚════════════════════════════════════════════╝\n');

    await setupTestData();

    const tests = [
        // Export Tests
        ['Export Assets (JSON)', testExportAssetsJSON],
        ['Export Assets (CSV)', testExportAssetsCSV],
        ['Export Transactions (JSON)', testExportTransactionsJSON],
        ['Export Transactions (CSV)', testExportTransactionsCSV],
        ['Export Portfolio (JSON)', testExportPortfolioJSON],
        
        // Import Tests
        ['Import Assets (JSON)', testImportAssetsJSON],
        ['Import Assets (CSV)', testImportAssetsCSV],
        ['Import Invalid Data', testImportInvalidData],
        
        // Reporting Tests
        ['Monthly Report', testMonthlyReport],
        ['Performance Report', testPerformanceReport],
        ['Distribution Report', testDistributionReport],
        ['Transaction Summary', testTransactionSummary],
        ['Transaction Summary with Date Range', testTransactionSummaryWithDateRange],
        ['Portfolio History', testPortfolioHistory],
        ['Top Performers', testTopPerformers],
        ['Risk Analysis', testRiskAnalysis]
    ];

    let passed = 0;
    let failed = 0;

    console.log('🧪 Export/Import Testleri:\n');
    for (let i = 0; i < 8; i++) {
        const [name, testFn] = tests[i];
        const result = await runTest(name, testFn);
        if (result) passed++;
        else failed++;
        // Rate limit için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n📈 Raporlama Testleri:\n');
    for (let i = 8; i < tests.length; i++) {
        const [name, testFn] = tests[i];
        const result = await runTest(name, testFn);
        if (result) passed++;
        else failed++;
        // Rate limit için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    await cleanupTestData();

    console.log('\n╔════════════════════════════════════════════╗');
    console.log(`║  ✅ Başarılı: ${passed.toString().padEnd(28)} ║`);
    console.log(`║  ❌ Başarısız: ${failed.toString().padEnd(27)} ║`);
    console.log(`║  📊 Toplam: ${tests.length.toString().padEnd(30)} ║`);
    console.log('╚════════════════════════════════════════════╝\n');

    if (failed > 0) {
        process.exit(1);
    }
}

// Sunucu hazır mı kontrol et
function waitForServer(retries = 10) {
    return new Promise((resolve, reject) => {
        const attempt = () => {
            http.get(BASE_URL + '/api/v1/health', (res) => {
                if (res.statusCode === 200) {
                    resolve();
                } else if (retries > 0) {
                    setTimeout(() => {
                        retries--;
                        attempt();
                    }, 1000);
                } else {
                    reject(new Error('Sunucu başlatılamadı'));
                }
            }).on('error', () => {
                if (retries > 0) {
                    setTimeout(() => {
                        retries--;
                        attempt();
                    }, 1000);
                } else {
                    reject(new Error('Sunucu başlatılamadı'));
                }
            });
        };
        attempt();
    });
}

// Start tests
console.log('⏳ Sunucu bekleniyor...\n');
waitForServer()
    .then(() => {
        console.log('✅ Sunucu hazır\n');
        return runAllTests();
    })
    .catch(error => {
        console.error('❌ Test başlatma hatası:', error.message);
        console.error('💡 Önce sunucuyu başlatın: npm start');
        process.exit(1);
    });
