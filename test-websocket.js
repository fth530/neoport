const { io } = require("socket.io-client");
const http = require('http');

async function testWebSocket() {
    console.log('🧪 WebSocket Test Başlıyor...');

    let testCompleted = false;

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
        if (!testCompleted) {
            console.error('❌ Test timeout (10s)');
            process.exit(1);
        }
    }, 10000);

    // 1. Socket Client Bağlanıyor
    const socket = io("http://localhost:3000", {
        timeout: 5000,
        retries: 3
    });

    socket.on("connect", () => {
        console.log("✅ Socket bağlandı (Client ID:", socket.id, ")");

        // 2. Refresh Endpoint'ini Tetikle (Fiyat güncellemesi)
        console.log("🔄 Fiyat güncellemesi tetikleniyor...");
        triggerPriceRefresh();
    });

    socket.on("price_update", (data) => {
        console.log("✅ WebSocket Mesajı Alındı!");
        console.log("   - Type:", data.type);
        console.log("   - Timestamp:", data.timestamp);
        console.log("   - Varlık Sayısı:", data.assets ? data.assets.length : 0);
        console.log("   - Summary:", data.summary ? 'Mevcut' : 'Yok');

        testCompleted = true;
        clearTimeout(timeout);
        socket.disconnect();
        console.log("✅ Test Başarılı - WebSocket entegrasyonu çalışıyor!");
        process.exit(0);
    });

    socket.on("connect_error", (err) => {
        console.error(`❌ Bağlantı hatası: ${err.message}`);
        testCompleted = true;
        clearTimeout(timeout);
        process.exit(1);
    });

    socket.on("disconnect", (reason) => {
        if (!testCompleted) {
            console.log(`⚠️ Socket bağlantısı kesildi: ${reason}`);
        }
    });
}

function triggerPriceRefresh() {
    const postData = JSON.stringify({});
    
    const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/prices/refresh',
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, (res) => {
        console.log(`   - HTTP Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                console.log(`   - Response: ${response.message || 'OK'}`);
            } catch (e) {
                console.log(`   - Response: ${res.statusCode} ${res.statusMessage}`);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`   - HTTP Request Hatası: ${e.message}`);
        console.log('   - Server çalışıyor mu kontrol edin: npm start');
    });

    req.write(postData);
    req.end();
}

// Check if server is running first
console.log('🔍 Server durumu kontrol ediliyor...');
const healthCheck = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/health',
    method: 'GET',
    timeout: 3000
}, (res) => {
    if (res.statusCode === 200) {
        console.log('✅ Server çalışıyor, WebSocket testi başlatılıyor...');
        testWebSocket();
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
    console.log('💡 Server çalışıyor mu kontrol edin: npm start');
    process.exit(1);
});

healthCheck.end();
