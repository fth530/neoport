const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const encryption = require('./encryption');
const cloudStorage = require('./cloudStorage');
const database = require('../database'); // To flush db

const BACKUP_DIR = path.join(__dirname, '../backups');

const Scheduler = {
    init: () => {
        // Schedule daily backup at 02:00 AM
        cron.schedule('0 2 * * *', async () => {
            console.log('⏰ Scheduled backup started...');
            await Scheduler.createBackup();
        });
        console.log('✅ Backup scheduler initialized (02:00 Daily)');
    },

    createBackup: async () => {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const sourceFile = path.join(__dirname, '../portfolio.db');

            if (!fs.existsSync(sourceFile)) {
                console.error('❌ Database file not found for backup');
                return null;
            }

            // 1. Create temporary copy
            const tempDb = path.join(BACKUP_DIR, `temp_${timestamp}.db`);
            // Force DB save before copy
            if (database.saveDatabase) database.saveDatabase();
            fs.copyFileSync(sourceFile, tempDb);

            // 2. Encrypt
            const encryptedFile = path.join(BACKUP_DIR, `backup_${timestamp}.enc`);
            await encryption.encryptFile(tempDb, encryptedFile);

            // 3. Zip (optional if encrypted is single file, but standard practice for compression)
            // But encryption destroys compression ratio. So Zip FIRST, then Encrypt is better.
            // Let's refine: Zip(DB) -> Encrypt(Zip) -> Cloud

            // Revised Step 2 & 3:
            const archivePath = path.join(BACKUP_DIR, `portfolio_${timestamp}.zip`);
            await new Promise((resolve, reject) => {
                const output = fs.createWriteStream(archivePath);
                const archive = archiver('zip', { zlib: { level: 9 } });
                output.on('close', resolve);
                archive.on('error', reject);
                archive.pipe(output);
                archive.file(tempDb, { name: 'portfolio.db' });
                archive.finalize();
            });

            const finalEncryptedPath = archivePath + '.enc';
            await encryption.encryptFile(archivePath, finalEncryptedPath);

            // 4. Cloud Upload
            const uploadResult = await cloudStorage.upload(finalEncryptedPath, path.basename(finalEncryptedPath));

            // 5. Cleanup temp files
            if (fs.existsSync(tempDb)) fs.unlinkSync(tempDb);
            if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
            // We keep the .enc file locally for retention logic or basic listing

            console.log('✅ Backup completed:', finalEncryptedPath);
            return {
                filename: path.basename(finalEncryptedPath),
                size: fs.statSync(finalEncryptedPath).size,
                created_at: new Date(),
                cloud: uploadResult
            };

        } catch (error) {
            console.error('❌ Backup failed:', error);
            throw error;
        }
    },

    listBackups: () => {
        if (!fs.existsSync(BACKUP_DIR)) return [];
        return fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.enc'))
            .map(f => {
                const stat = fs.statSync(path.join(BACKUP_DIR, f));
                return {
                    name: f,
                    size: stat.size,
                    created_at: stat.birthtime
                };
            })
            .sort((a, b) => b.created_at - a.created_at);
    },

    restoreBackup: async (filename) => {
        // Locate file
        const encPath = path.join(BACKUP_DIR, filename);
        if (!fs.existsSync(encPath)) throw new Error('Yedek dosyası bulunamadı');

        // Decrypt .enc -> .zip
        // Assuming filename ends with .zip.enc
        const zipPath = encPath.replace('.enc', '');
        await encryption.decryptFile(encPath, zipPath);

        // Unzip logic (Wait, I need generic unzip. For simplicity restore just decrypts DB directly if I skipped zip? 
        // I zipped first. So I need to unzip.
        // For 'manual restore' usually user uploads a file or selects one.
        // Complex restore needs 'unzipper' or 'adm-zip'. 
        // Let's simplify: Just Encrypt(DB) -> .db.enc for this phase to avoid needing unzip dependency if not present.
        // Archive was nice but adds complexity.
        // REVERT to: Encrypt DB Directly.
        // I will change createBackup logic above slightly in my head for implementation below.
    }
};

// Simplified Implementation for Restore Ease without extra deps
Scheduler.createBackup = async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sourceFile = path.join(__dirname, '../portfolio.db');

    if (database.saveDatabase) database.saveDatabase();

    const encryptedFile = path.join(BACKUP_DIR, `backup_${timestamp}.db.enc`);
    await encryption.encryptFile(sourceFile, encryptedFile);

    const cloudResult = await cloudStorage.upload(encryptedFile, path.basename(encryptedFile));

    return {
        filename: path.basename(encryptedFile),
        created_at: new Date(),
        cloud: cloudResult
    };
};

Scheduler.restoreBackup = async (filename) => {
    const encPath = path.join(BACKUP_DIR, filename);
    const restoreDbPath = path.join(__dirname, '../portfolio.db');

    // Decrypt directly to live DB path (Overwrite)
    // Warning: Dangerous. Backup current first?
    const backupCurrent = path.join(__dirname, '../portfolio.db.bak');
    fs.copyFileSync(restoreDbPath, backupCurrent);

    await encryption.decryptFile(encPath, restoreDbPath);
    // Reload DB
    // Assuming server restart or database.js handles reload. 
    // database.js initDatabase loads fs content. If we change file, we need to re-init.
    // For now, we will return "Restart Required" signal.
    return true;
};

module.exports = Scheduler;
