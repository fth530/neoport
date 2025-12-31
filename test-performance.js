// Performance Test Script
const API_BASE = 'http://localhost:3000/api';

async function measureTime(name, fn) {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    console.log(`⏱️ ${name}: ${duration}ms`);
    return duration;
}

async function testPerformance() {
    console.log('🚀 Performans Testleri Başlıyor...\n');

    // Test 1: Basit GET isteği
    console.log('Test 1: Basit GET İsteği');
    await measureTime('GET /api/assets', async () => {
        await fetch(`${API_BASE}/assets`);
    });

    // Test 2: Cache performansı
    console.log('\nTest 2: Cache Performansı');
    const firstRequest = await measureTime('İlk istek (cache miss)', async () => {
        await fetch(`${API_BASE}/assets`);
    });
    
    const secondRequest = await measureTime('İkinci istek (cache hit)', async () => {
        await fetch(`${API_BASE}/assets`);
    });
    
    const improvement = Math.round((1 - secondRequest / firstRequest) * 100);
    console.log(`✅ Cache ile ${improvement}% daha hızlı`);

    // Test 3: Compression
    console.log('\nTest 3: Compression Kontrolü');
    const res = await fetch(`${API_BASE}/assets`);
    const encoding = res.headers.get('content-encoding');
    const contentLength = res.headers.get('content-length');
    console.log(`📦 Encoding: ${encoding || 'none'}`);
    console.log(`📏 Content-Length: ${contentLength || 'unknown'} bytes`);

    // Test 4: Response time header
    console.log('\nTest 4: Response Time Header');
    const timeRes = await fetch(`${API_BASE}/assets`);
    const responseTime = timeRes.headers.get('x-response-time');
    console.log(`⏱️ X-Response-Time: ${responseTime}`);

    // Test 5: Concurrent requests
    console.log('\nTest 5: Eşzamanlı İstekler (10 istek)');
    const concurrentStart = Date.now();
    await Promise.all(
        Array(10).fill(null).map(() => fetch(`${API_BASE}/assets`))
    );
    const concurrentDuration = Date.now() - concurrentStart;
    console.log(`⏱️ 10 eşzamanlı istek: ${concurrentDuration}ms`);
    console.log(`📊 Ortalama: ${Math.round(concurrentDuration / 10)}ms/istek`);

    // Test 6: Sequential requests
    console.log('\nTest 6: Sıralı İstekler (10 istek)');
    const sequentialStart = Date.now();
    for (let i = 0; i < 10; i++) {
        await fetch(`${API_BASE}/assets`);
    }
    const sequentialDuration = Date.now() - sequentialStart;
    console.log(`⏱️ 10 sıralı istek: ${sequentialDuration}ms`);
    console.log(`📊 Ortalama: ${Math.round(sequentialDuration / 10)}ms/istek`);

    // Test 7: POST performance
    console.log('\nTest 7: POST İşlemi');
    const postDuration = await measureTime('POST /api/assets', async () => {
        const res = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Performance Test',
                symbol: 'PERF',
                type: 'crypto',
                quantity: 1,
                avg_cost: 100
            })
        });
        const data = await res.json();
        if (data.id) {
            // Temizle
            await fetch(`${API_BASE}/assets/${data.id}`, { method: 'DELETE' });
        }
    });

    // Test 8: Metrics endpoint
    console.log('\nTest 8: Metrics Endpoint');
    const metricsRes = await fetch(`${API_BASE}/metrics`);
    const metrics = await metricsRes.json();
    console.log('📊 Sunucu Metrikleri:');
    console.log(`   Uptime: ${metrics.uptime}`);
    console.log(`   Total Requests: ${metrics.requests.total}`);
    console.log(`   Success Rate: ${Math.round(metrics.requests.success / metrics.requests.total * 100)}%`);
    console.log(`   Avg Response Time: ${metrics.avgResponseTime}`);
    console.log(`   Memory (Heap Used): ${metrics.memory.heapUsed} MB`);

    // Test 9: Health check
    console.log('\nTest 9: Health Check');
    const healthRes = await fetch(`${API_BASE}/health`);
    const health = await healthRes.json();
    console.log(`✅ Status: ${health.status}`);
    console.log(`⏱️ Uptime: ${Math.round(health.uptime)}s`);

    console.log('\n✅ Performans testleri tamamlandı!');
}

testPerformance().catch(console.error);
