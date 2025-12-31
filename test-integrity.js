// Data Integrity Test Script
const API_BASE = 'http://localhost:3000/api';

async function testDataIntegrity() {
    console.log('🔍 Veri Bütünlüğü Testleri Başlıyor...\n');

    // Test 1: Duplicate varlık kontrolü
    console.log('Test 1: Duplicate Varlık Kontrolü');
    try {
        // İlk varlık
        const res1 = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Coin',
                symbol: 'TEST',
                type: 'crypto',
                quantity: 1,
                avg_cost: 100
            })
        });
        const data1 = await res1.json();
        
        if (res1.ok) {
            // Aynı sembol ile tekrar dene
            const res2 = await fetch(`${API_BASE}/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test Coin 2',
                    symbol: 'TEST',
                    type: 'crypto',
                    quantity: 1,
                    avg_cost: 100
                })
            });
            const data2 = await res2.json();
            
            if (res2.ok) {
                console.log('❌ Duplicate varlık eklenebildi (HATA!)');
                // Temizle
                await fetch(`${API_BASE}/assets/${data1.id}`, { method: 'DELETE' });
                await fetch(`${API_BASE}/assets/${data2.id}`, { method: 'DELETE' });
            } else {
                console.log('✅ Duplicate varlık engellendi:', data2.error);
                // Temizle
                await fetch(`${API_BASE}/assets/${data1.id}`, { method: 'DELETE' });
            }
        }
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 2: Yetersiz bakiye kontrolü
    console.log('\nTest 2: Yetersiz Bakiye Kontrolü');
    try {
        // Varlık ekle
        const res1 = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Balance Test',
                symbol: 'BAL',
                type: 'crypto',
                quantity: 10,
                avg_cost: 100
            })
        });
        const asset = await res1.json();
        
        if (res1.ok) {
            // 20 adet satmaya çalış (sadece 10 var)
            const res2 = await fetch(`${API_BASE}/assets/${asset.id}/sell`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quantity: 20,
                    price: 150
                })
            });
            const data2 = await res2.json();
            
            if (res2.ok) {
                console.log('❌ Yetersiz bakiye ile satış yapıldı (HATA!)');
            } else {
                console.log('✅ Yetersiz bakiye engellendi:', data2.error);
            }
            
            // Temizle
            await fetch(`${API_BASE}/assets/${asset.id}`, { method: 'DELETE' });
        }
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 3: Negatif değer kontrolü
    console.log('\nTest 3: Negatif Değer Kontrolü');
    try {
        const res = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Negative Test',
                symbol: 'NEG',
                type: 'crypto',
                quantity: -10,
                avg_cost: 100
            })
        });
        const data = await res.json();
        
        if (res.ok) {
            console.log('❌ Negatif miktar kabul edildi (HATA!)');
            await fetch(`${API_BASE}/assets/${data.id}`, { method: 'DELETE' });
        } else {
            console.log('✅ Negatif miktar engellendi:', data.error);
        }
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 4: Veri bütünlüğü kontrolü
    console.log('\nTest 4: Veri Bütünlüğü Kontrolü');
    try {
        const res = await fetch(`${API_BASE}/integrity/check`);
        const data = await res.json();
        
        if (res.ok) {
            console.log('✅ Veri bütünlüğü kontrolü başarılı');
            console.log(`   Toplam Sorun: ${data.totalIssues}`);
            console.log(`   Orphan Transactions: ${data.results.orphanTransactions.length}`);
            console.log(`   Negatif Miktarlar: ${data.results.negativeQuantities.length}`);
            console.log(`   Tutarsız Ortalama Maliyet: ${data.results.inconsistentAverageCost.length}`);
        } else {
            console.log('❌ Veri bütünlüğü kontrolü başarısız:', data.error);
        }
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 5: Backup oluşturma
    console.log('\nTest 5: Backup Oluşturma');
    try {
        const res = await fetch(`${API_BASE}/backup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        
        if (res.ok) {
            console.log('✅ Backup oluşturuldu:', data.path);
        } else {
            console.log('❌ Backup oluşturulamadı:', data.error);
        }
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 6: Constraint validation
    console.log('\nTest 6: Constraint Validation');
    try {
        // Geçersiz tür
        const res = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Invalid Type',
                symbol: 'INV',
                type: 'invalid_type',
                quantity: 1,
                avg_cost: 100
            })
        });
        const data = await res.json();
        
        if (res.ok) {
            console.log('❌ Geçersiz tür kabul edildi (HATA!)');
            await fetch(`${API_BASE}/assets/${data.id}`, { method: 'DELETE' });
        } else {
            console.log('✅ Geçersiz tür engellendi:', data.error);
        }
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    // Test 7: Çok büyük değer kontrolü
    console.log('\nTest 7: Çok Büyük Değer Kontrolü');
    try {
        const res = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Big Number',
                symbol: 'BIG',
                type: 'crypto',
                quantity: 9999999999999,
                avg_cost: 100
            })
        });
        const data = await res.json();
        
        if (res.ok) {
            console.log('❌ Çok büyük değer kabul edildi (HATA!)');
            await fetch(`${API_BASE}/assets/${data.id}`, { method: 'DELETE' });
        } else {
            console.log('✅ Çok büyük değer engellendi:', data.error);
        }
    } catch (error) {
        console.log('❌ Test başarısız:', error.message);
    }

    console.log('\n✅ Veri bütünlüğü testleri tamamlandı!');
}

testDataIntegrity().catch(console.error);
