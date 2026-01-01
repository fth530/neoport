const fs = require('fs');
const path = require('path');

async function runMigrations(db) {
    console.log('🔄 Migration kontrolü yapılıyor...');

    try {
        // 1. Migration tablosunu oluştur
        db.run(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                batch INTEGER,
                migration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Migration dosyalarını listele
        const migrationsDir = path.join(__dirname, '../migrations');
        if (!fs.existsSync(migrationsDir)) {
            console.log('⚠️ Migrations klasörü bulunamadı, oluşturuluyor...');
            fs.mkdirSync(migrationsDir, { recursive: true });
            return;
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        if (files.length === 0) {
            console.log('ℹ️ Çalıştırılacak migration dosyası bulunamadı.');
            return;
        }

        // 3. Çalıştırılmış migrationları getir
        const executedMigrations = new Set();
        const stmt = db.prepare('SELECT name FROM _migrations');
        while (stmt.step()) {
            executedMigrations.add(stmt.getAsObject().name);
        }
        stmt.free();

        // 4. Yeni batch ID belirle
        let batch = 1;
        const batchStmt = db.prepare('SELECT MAX(batch) as max_batch FROM _migrations');
        if (batchStmt.step()) {
            const result = batchStmt.getAsObject();
            if (result.max_batch) batch = result.max_batch + 1;
        }
        batchStmt.free();

        // 5. Migrationları çalıştır
        let count = 0;
        for (const file of files) {
            if (!executedMigrations.has(file)) {
                console.log(`▶️ Migration çalıştırılıyor: ${file}`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

                // Transaction kaldırıldı (sql.js stabilite testi)
                try {
                    // Çoklu statement desteği için exec kullanmayı deneyebiliriz ama run genellikle çalışır.
                    // Güvenlik için exec kullanalım çünkü sql dosyasında birden fazla statement var.
                    db.exec(sql);
                    db.run('INSERT INTO _migrations (name, batch) VALUES (?, ?)', [file, batch]);

                    console.log(`✅ Migration başarılı: ${file}`);
                    count++;
                } catch (error) {
                    console.error(`❌ Migration hatası (${file}):`, error.message);
                    throw error;
                }
            }
        }

        if (count > 0) {
            console.log(`✅ Toplam ${count} migration başarıyla uygulandı.`);
        } else {
            console.log('✅ Veritabanı güncel.');
        }

    } catch (error) {
        console.error('❌ Migration işlemi başarısız:', error);
        throw error;
    }
}

module.exports = { runMigrations };
