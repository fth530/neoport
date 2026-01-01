const http = require('http');

async function testCharts() {
    console.log('🧪 Advanced Charts Test Başlıyor...');

    try {
        // 1. History endpoint test
        console.log('📊 1. Portfolio History Endpoint Test...');
        await testHistoryEndpoint();

        // 2. Chart data format test
        console.log('📈 2. Chart Data Format Test...');
        await testChartDataFormat();

        console.log('✅ Tüm chart testleri başarılı!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Chart test hatası:', error);
        process.exit(1);
    }
}

function testHistoryEndpoint() {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/reports/history',
            method: 'GET',
            timeout: 5000
        }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const historyData = JSON.parse(data);
                        console.log(`   ✅ Status: ${res.statusCode}`);
                        console.log(`   ✅ Data Points: ${historyData.length}`);
                        
                        if (historyData.length > 0) {
                            const sample = historyData[0];
                            console.log(`   ✅ Sample Data:`, {
                                date: sample.date,
                                value: sample.value,
                                investedValue: sample.investedValue
                            });
                            
                            // Data format validation
                            const hasRequiredFields = sample.date && 
                                                    typeof sample.value === 'number' && 
                                                    typeof sample.investedValue === 'number';
                            
                            if (hasRequiredFields) {
                                console.log('   ✅ Data format valid');
                            } else {
                                throw new Error('Invalid data format');
                            }
                        } else {
                            console.log('   ℹ️ No history data (empty portfolio)');
                        }
                        
                        resolve();
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                } catch (parseError) {
                    reject(new Error(`JSON Parse Error: ${parseError.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Request Error: ${error.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

function testChartDataFormat() {
    return new Promise((resolve, reject) => {
        // Test with sample data
        const sampleData = [
            { date: '2025-01-01', value: 10000, investedValue: 8000 },
            { date: '2025-01-02', value: 11000, investedValue: 9000 }
        ];

        try {
            // Test date formatting
            const labels = sampleData.map(d => new Date(d.date).toLocaleDateString('tr-TR', { 
                day: 'numeric', 
                month: 'short' 
            }));
            
            console.log('   ✅ Date formatting:', labels);

            // Test data extraction
            const investedValues = sampleData.map(d => d.investedValue);
            const totalValues = sampleData.map(d => d.value);
            
            console.log('   ✅ Invested values:', investedValues);
            console.log('   ✅ Total values:', totalValues);

            // Test compact currency formatting
            const testValues = [1500, 15000, 1500000];
            testValues.forEach(value => {
                const compact = formatCurrencyCompact(value);
                console.log(`   ✅ ${value} → ${compact}`);
            });

            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

function formatCurrencyCompact(value) {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M ₺';
    } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K ₺';
    }
    return value + ' ₺';
}

// Health check first
console.log('🔍 Server durumu kontrol ediliyor...');
const healthCheck = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/health',
    method: 'GET',
    timeout: 3000
}, (res) => {
    if (res.statusCode === 200) {
        console.log('✅ Server çalışıyor, chart testleri başlatılıyor...');
        testCharts();
    } else {
        console.error(`❌ Server sağlık kontrolü başarısız: ${res.statusCode}`);
        process.exit(1);
    }
});

healthCheck.on('error', (e) => {
    console.error(`❌ Server'a bağlanılamıyor: ${e.message}`);
    console.log('💡 Önce server'ı başlatın: npm start');
    process.exit(1);
});

healthCheck.on('timeout', () => {
    console.error('❌ Server health check timeout');
    process.exit(1);
});

healthCheck.end();