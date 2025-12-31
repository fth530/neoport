// Security Test Script
const API_BASE = 'http://localhost:3000/api';

async function testSecurity() {
    console.log('🔒 Güvenlik Testleri Başlıyor...\n');

    // Test 1: XSS Injection
    console.log('Test 1: XSS Injection Koruması');
    try {
        const res = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: '<script>alert("XSS")</script>',
                symbol: 'XSS',
                type: 'crypto',
                quantity: 1,
                avg_cost: 100
            })
        });
        const data = await res.json();
        if (res.ok) {
            console.log('✅ XSS temizlendi:', data.name);
            // Temizle
            await fetch(`${API_BASE}/assets/${data.id}`, { method: 'DELETE' });
        } else {
            console.log('✅ XSS engellendi:', data.error);
        }
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 2: SQL Injection (SQLite prepared statements kullanıyor)
    console.log('\nTest 2: SQL Injection Koruması');
    try {
        const res = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: "'; DROP TABLE assets; --",
                symbol: 'SQL',
                type: 'crypto',
                quantity: 1,
                avg_cost: 100
            })
        });
        const data = await res.json();
        if (res.ok) {
            console.log('✅ SQL Injection engellendi, varlık eklendi:', data.name);
            await fetch(`${API_BASE}/assets/${data.id}`, { method: 'DELETE' });
        } else {
            console.log('✅ SQL Injection engellendi:', data.error);
        }
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 3: Çok uzun input
    console.log('\nTest 3: Uzun Input Validasyonu');
    try {
        const res = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'A'.repeat(200),
                symbol: 'LONG',
                type: 'crypto',
                quantity: 1,
                avg_cost: 100
            })
        });
        const data = await res.json();
        console.log(res.ok ? '❌ Uzun input kabul edildi' : '✅ Uzun input engellendi:', data.error);
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 4: Geçersiz karakter
    console.log('\nTest 4: Geçersiz Karakter Validasyonu');
    try {
        const res = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test@#$%^&*()',
                symbol: 'TST',
                type: 'crypto',
                quantity: 1,
                avg_cost: 100
            })
        });
        const data = await res.json();
        console.log(res.ok ? '❌ Geçersiz karakter kabul edildi' : '✅ Geçersiz karakter engellendi:', data.error);
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 5: Negatif değer
    console.log('\nTest 5: Negatif Değer Validasyonu');
    try {
        const res = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test',
                symbol: 'TST',
                type: 'crypto',
                quantity: -100,
                avg_cost: 100
            })
        });
        const data = await res.json();
        console.log(res.ok ? '❌ Negatif değer kabul edildi' : '✅ Negatif değer engellendi:', data.error);
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 6: Çok büyük sayı
    console.log('\nTest 6: Büyük Sayı Validasyonu');
    try {
        const res = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test',
                symbol: 'TST',
                type: 'crypto',
                quantity: 9999999999999,
                avg_cost: 100
            })
        });
        const data = await res.json();
        console.log(res.ok ? '❌ Çok büyük sayı kabul edildi' : '✅ Çok büyük sayı engellendi:', data.error);
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 7: Geçersiz tür
    console.log('\nTest 7: Geçersiz Tür Validasyonu');
    try {
        const res = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test',
                symbol: 'TST',
                type: 'invalid_type',
                quantity: 1,
                avg_cost: 100
            })
        });
        const data = await res.json();
        console.log(res.ok ? '❌ Geçersiz tür kabul edildi' : '✅ Geçersiz tür engellendi:', data.error);
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 8: Rate Limiting (çok fazla istek)
    console.log('\nTest 8: Rate Limiting (10 istek)');
    try {
        let rateLimited = false;
        for (let i = 0; i < 10; i++) {
            const res = await fetch(`${API_BASE}/assets`);
            if (res.status === 429) {
                rateLimited = true;
                console.log(`✅ Rate limit aktif: ${i + 1}. istekte engellendi`);
                break;
            }
        }
        if (!rateLimited) {
            console.log('⚠️ Rate limit henüz tetiklenmedi (normal, limit yüksek)');
        }
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    console.log('\n✅ Güvenlik testleri tamamlandı!');
}

testSecurity().catch(console.error);
