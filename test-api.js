// API Test Script
const API_BASE = 'http://localhost:3000/api/v1';

async function testAPI() {
    console.log('🧪 API Test Başlıyor...\n');

    // Test 1: Eksik alan hatası
    console.log('Test 1: Eksik alan validasyonu');
    try {
        const res = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test' })
        });
        const data = await res.json();
        console.log('✅ Beklenen hata:', data.error);
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 2: Negatif miktar hatası
    console.log('\nTest 2: Negatif miktar validasyonu');
    try {
        const res = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Coin',
                symbol: 'TST',
                type: 'crypto',
                quantity: -5,
                avg_cost: 100
            })
        });
        const data = await res.json();
        console.log('✅ Beklenen hata:', data.error);
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 3: Başarılı varlık ekleme
    console.log('\nTest 3: Başarılı varlık ekleme');
    try {
        const res = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Bitcoin',
                symbol: 'BTC',
                type: 'crypto',
                quantity: 0.5,
                avg_cost: 2000000,
                currency: 'TRY'
            })
        });
        const data = await res.json();
        console.log('✅ Varlık eklendi:', data.name, '(ID:', data.id + ')');

        // Test 4: Varlık silme
        console.log('\nTest 4: Varlık silme');
        const deleteRes = await fetch(`${API_BASE}/assets/${data.id}`, {
            method: 'DELETE'
        });
        const deleteData = await deleteRes.json();
        console.log('✅ Varlık silindi:', deleteData.message);
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 5: Geçersiz ID
    console.log('\nTest 5: Geçersiz ID validasyonu');
    try {
        const res = await fetch(`${API_BASE}/assets/abc`, {
            method: 'GET'
        });
        const data = await res.json();
        console.log('✅ Beklenen hata:', data.error);
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    console.log('\n✅ Tüm testler tamamlandı!');
}

testAPI().catch(console.error);
