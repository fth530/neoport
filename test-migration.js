const database = require('./database');
const fs = require('fs');

async function testMigration() {
    console.log('🧪 Migration sistemi test ediliyor...');

    try {
        // Init database (creates file if not exists and runs migrations)
        console.log('1. Veritabanı başlatılıyor...');
        const db = await database.initDatabase();

        // Check _migrations table
        console.log('2. _migrations tablosu kontrol ediliyor...');
        const migrationTable = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'");

        if (migrationTable.length > 0 && migrationTable[0].values.length > 0) {
            console.log('✅ _migrations tablosu mevcut.');
        } else {
            console.error('❌ _migrations tablosu bulunamadı!');
            process.exit(1);
        }

        // Check if migration record exists
        console.log('3. Migration kayıtları kontrol ediliyor...');
        const migrations = db.exec("SELECT * FROM _migrations");
        if (migrations.length > 0 && migrations[0].values.length > 0) {
            console.log('✅ Migration kayıtları bulundu:', migrations[0].values);
        } else {
            console.error('❌ Hiçbir migration kaydı bulunamadı!');
            process.exit(1);
        }

        // Check assets table
        console.log('4. assets tablosu kontrol ediliyor...');
        const assetsTable = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='assets'");
        if (assetsTable.length > 0) {
            console.log('✅ assets tablosu mevcut.');
        } else {
            console.error('❌ assets tablosu oluşturulmamış!');
            process.exit(1);
        }

        console.log('✅ TEST BAŞARILI: Migration sistemi sorunsuz çalışıyor.');

    } catch (error) {
        console.error('❌ Test sırasında hata:', error);
        process.exit(1);
    }
}

testMigration();
