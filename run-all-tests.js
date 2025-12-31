/**
 * Tüm testleri sırayla çalıştır
 * Rate limit sorununu önlemek için testler arası bekleme ile
 */

const { spawn } = require('child_process');

const tests = [
    { name: 'API Tests', command: 'npm', args: ['test'] },
    { name: 'Security Tests', command: 'npm', args: ['run', 'test:security'] },
    { name: 'Performance Tests', command: 'npm', args: ['run', 'test:performance'] },
    { name: 'Integrity Tests', command: 'npm', args: ['run', 'test:integrity'] },
    { name: 'Functional Tests', command: 'npm', args: ['run', 'test:functional'] }
];

let totalPassed = 0;
let totalFailed = 0;

function runTest(test) {
    return new Promise((resolve, reject) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🧪 ${test.name} Başlatılıyor...`);
        console.log('='.repeat(60));

        const proc = spawn(test.command, test.args, {
            stdio: 'inherit',
            shell: true
        });

        proc.on('close', (code) => {
            if (code === 0) {
                console.log(`\n✅ ${test.name} - BAŞARILI\n`);
                resolve(true);
            } else {
                console.log(`\n❌ ${test.name} - BAŞARISIZ\n`);
                resolve(false);
            }
        });

        proc.on('error', (error) => {
            console.error(`\n❌ ${test.name} - HATA: ${error.message}\n`);
            resolve(false);
        });
    });
}

async function runAllTests() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          🚀 TÜM TESTLER ÇALIŞTIRILIYOR                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const results = [];

    for (const test of tests) {
        const result = await runTest(test);
        results.push({ name: test.name, passed: result });
        
        // Rate limit için testler arası 3 saniye bekle
        if (tests.indexOf(test) < tests.length - 1) {
            console.log('⏳ Rate limit için 3 saniye bekleniyor...\n');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    // Özet
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 TEST ÖZETİ                          ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    
    results.forEach(result => {
        const status = result.passed ? '✅ BAŞARILI' : '❌ BAŞARISIZ';
        const padding = ' '.repeat(40 - result.name.length);
        console.log(`║  ${result.name}${padding}${status}     ║`);
        if (result.passed) totalPassed++;
        else totalFailed++;
    });
    
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Toplam: ${tests.length} test                                          ║`);
    console.log(`║  ✅ Başarılı: ${totalPassed}                                            ║`);
    console.log(`║  ❌ Başarısız: ${totalFailed}                                            ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (totalFailed > 0) {
        console.log('❌ Bazı testler başarısız oldu!\n');
        process.exit(1);
    } else {
        console.log('🎉 Tüm testler başarıyla tamamlandı!\n');
        process.exit(0);
    }
}

runAllTests().catch(error => {
    console.error('❌ Test çalıştırma hatası:', error);
    process.exit(1);
});
