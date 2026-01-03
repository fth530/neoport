const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');
const { ConstraintValidator } = require('./middleware/transaction');

const DB_PATH = path.join(__dirname, 'portfolio.db');

let db = null;

// Veritabanını başlat
/**
 * Initializes the SQLite database.
 * Loads existing DB from file or creates a new one.
 * Runs necessary migrations.
 * @async
 * @returns {Promise<Object>} The database instance
 * @throws {Error} If initialization fails
 */
async function initDatabase() {
    try {
        const SQL = await initSqlJs();

        // Mevcut veritabanı dosyası varsa yükle
        if (fs.existsSync(DB_PATH)) {
            try {
                const fileBuffer = fs.readFileSync(DB_PATH);
                db = new SQL.Database(fileBuffer);
                // console.log('✅ Mevcut veritabanı yüklendi');
            } catch (error) {
                console.error('⚠️ Veritabanı dosyası bozuk, yeni oluşturuluyor:', error.message);
                db = new SQL.Database();
            }
        } else {
            db = new SQL.Database();
            // console.log('✅ Yeni veritabanı oluşturuldu');
        }

        // Tabloları oluştur
        const { runMigrations } = require('./utils/migrate');

        // İşlemler tablosu
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER,
            type TEXT CHECK(type IN ('buy', 'sell')),
            quantity REAL,
            price REAL,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            total REAL,
            FOREIGN KEY(asset_id) REFERENCES assets(id)
        )`);

        // Fiyat Alarmları Tablosu
        db.run(`CREATE TABLE IF NOT EXISTS price_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_symbol TEXT NOT NULL,
            alert_type TEXT CHECK(alert_type IN ('PRICE_ABOVE', 'PRICE_BELOW', 'VOLATILITY')), 
            threshold_value REAL NOT NULL,
            current_price REAL, 
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // Alarm Geçmişi Tablosu
        db.run(`CREATE TABLE IF NOT EXISTS alert_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_id INTEGER,
            triggered_at TEXT DEFAULT CURRENT_TIMESTAMP,
            trigger_price REAL,
            message TEXT,
            FOREIGN KEY(alert_id) REFERENCES price_alerts(id)
        )`);

        // Tabloları migration sistemi ile oluştur
        await runMigrations(db);

        saveDatabase();
        console.log('✅ Veritabanı başlatıldı');
        return db;
    } catch (error) {
        console.error('❌ Veritabanı başlatma hatası:', error);
        throw new Error('Veritabanı başlatılamadı: ' + error.message);
    }
}

// ... saveDatabase ...
// Veritabanını dosyaya kaydet
function saveDatabase() {
    if (!db) {
        console.error('⚠️ Veritabanı nesnesi mevcut değil');
        return;
    }

    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    } catch (error) {
        console.error('❌ Veritabanı kaydetme hatası:', error.message);
        throw new Error('Veritabanı kaydedilemedi');
    }
}

// Batch save - Birden fazla işlemi toplu kaydet
let savePending = false;
let saveTimeout = null;

function saveDatabaseBatch() {
    if (savePending) return;

    savePending = true;

    // 100ms bekle, birden fazla işlem varsa toplu kaydet
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        saveDatabase();
        savePending = false;
        saveTimeout = null;
    }, 100);
}

// =====================
// ASSET CRUD İşlemleri
// =====================

/**
 * Retrieves all assets with calculated profit/loss metrics.
 * @returns {Array<Object>} List of asset objects
 * @throws {Error} If query fails
 */
function getAllAssets() {
    try {
        const stmt = db.prepare(`
            SELECT 
                id, name, symbol, type, quantity, avg_cost, current_price, currency, icon, icon_bg,
                (quantity * current_price) as current_value,
                (quantity * current_price) - (quantity * avg_cost) as profit_loss,
                CASE 
                    WHEN avg_cost > 0 THEN ((current_price - avg_cost) / avg_cost) * 100 
                    ELSE 0 
                END as profit_loss_percent
            FROM assets
            ORDER BY (quantity * current_price) DESC
        `);

        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    } catch (error) {
        console.error('❌ Varlıklar getirme hatası:', error);
        throw new Error('Varlıklar getirilemedi');
    }
}

function getAssetById(id) {
    try {
        const stmt = db.prepare('SELECT * FROM assets WHERE id = ?');
        stmt.bind([id]);

        if (stmt.step()) {
            const result = stmt.getAsObject();
            stmt.free();
            return result;
        }
        stmt.free();
        return null;
    } catch (error) {
        console.error('❌ Varlık getirme hatası:', error);
        throw new Error('Varlık getirilemedi');
    }
}

function createAsset(asset) {
    try {
        // Validasyon
        ConstraintValidator.validateQuantity(asset.quantity || 0);
        ConstraintValidator.validatePrice(asset.avg_cost || 0);

        // Duplicate kontrolü
        const existing = db.prepare('SELECT id FROM assets WHERE symbol = ? AND type = ?');
        existing.bind([asset.symbol, asset.type]);
        if (existing.step()) {
            existing.free();
            throw new Error(`Bu sembol zaten mevcut: ${asset.symbol} (${asset.type})`);
        }
        existing.free();

        db.run(`
            INSERT INTO assets (name, symbol, type, quantity, avg_cost, current_price, currency, icon, icon_bg)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            asset.name,
            asset.symbol,
            asset.type,
            asset.quantity || 0,
            asset.avg_cost || 0,
            asset.current_price || asset.avg_cost || 0,
            asset.currency || 'TRY',
            asset.icon || 'fa-solid fa-coins',
            asset.icon_bg || 'gray'
        ]);

        const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];

        // İlk alım işlemini kaydet
        if (asset.quantity > 0 && asset.avg_cost > 0) {
            createTransaction({
                asset_id: lastId,
                type: 'buy',
                quantity: asset.quantity,
                price: asset.avg_cost
            });
        }

        saveDatabase();
        console.log(`✅ Varlık eklendi: ${asset.name} (ID: ${lastId})`);
        return { id: lastId, ...asset };
    } catch (error) {
        console.error('❌ Varlık ekleme hatası:', error);
        throw new Error('Varlık eklenemedi: ' + error.message);
    }
}

function updateAsset(id, updates) {
    try {
        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined && key !== 'id') {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            console.warn('⚠️ Güncellenecek alan yok');
            return null;
        }

        fields.push("updated_at = datetime('now')");
        values.push(id);

        db.run(`UPDATE assets SET ${fields.join(', ')} WHERE id = ?`, values);
        saveDatabase();

        console.log(`✅ Varlık güncellendi (ID: ${id})`);
        return getAssetById(id);
    } catch (error) {
        console.error('❌ Varlık güncelleme hatası:', error);
        throw new Error('Varlık güncellenemedi: ' + error.message);
    }
}

function deleteAsset(id) {
    try {
        const asset = getAssetById(id);
        if (!asset) {
            throw new Error('Varlık bulunamadı');
        }

        db.run('DELETE FROM transactions WHERE asset_id = ?', [id]);
        db.run('DELETE FROM assets WHERE id = ?', [id]);
        saveDatabase();

        console.log(`✅ Varlık silindi: ${asset.name} (ID: ${id})`);
        return { success: true };
    } catch (error) {
        console.error('❌ Varlık silme hatası:', error);
        throw new Error('Varlık silinemedi: ' + error.message);
    }
}

function buyAsset(id, quantity, price) {
    try {
        const asset = getAssetById(id);
        ConstraintValidator.validateAssetExists(asset, id);
        ConstraintValidator.validateQuantity(quantity);
        ConstraintValidator.validatePrice(price);

        const totalOldCost = asset.quantity * asset.avg_cost;
        const newPurchaseCost = quantity * price;
        const newTotalQuantity = asset.quantity + quantity;
        const newAvgCost = newTotalQuantity > 0 ? (totalOldCost + newPurchaseCost) / newTotalQuantity : 0;

        updateAsset(id, {
            quantity: newTotalQuantity,
            avg_cost: newAvgCost
        });

        createTransaction({
            asset_id: id,
            type: 'buy',
            quantity: quantity,
            price: price
        });

        console.log(`✅ Alım işlemi: ${asset.name} - ${quantity} @ ${price}`);
        return getAssetById(id);
    } catch (error) {
        console.error('❌ Alım işlemi hatası:', error);
        throw new Error('Alım işlemi başarısız: ' + error.message);
    }
}

function sellAsset(id, quantity, price) {
    try {
        const asset = getAssetById(id);
        ConstraintValidator.validateAssetExists(asset, id);
        ConstraintValidator.validateQuantity(quantity);
        ConstraintValidator.validatePrice(price);
        ConstraintValidator.validateSufficientBalance(asset.quantity, quantity);

        // Gerçekleşen kar/zarar hesapla: (satış fiyatı - ortalama maliyet) * miktar
        const realizedProfit = (price - asset.avg_cost) * quantity;
        const newQuantity = asset.quantity - quantity;

        // İşlemler tablosu
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER,
            type TEXT CHECK(type IN ('buy', 'sell')),
            quantity REAL,
            price REAL,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            total REAL,
            FOREIGN KEY(asset_id) REFERENCES assets(id)
        )`);

        // Fiyat Alarmları Tablosu
        db.run(`CREATE TABLE IF NOT EXISTS price_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_symbol TEXT NOT NULL,
            alert_type TEXT CHECK(alert_type IN ('PRICE_ABOVE', 'PRICE_BELOW', 'VOLATILITY')), 
            threshold_value REAL NOT NULL,
            current_price REAL, 
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // Alarm Geçmişi Tablosu
        db.run(`CREATE TABLE IF NOT EXISTS alert_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_id INTEGER,
            triggered_at TEXT DEFAULT CURRENT_TIMESTAMP,
            trigger_price REAL,
            message TEXT,
            FOREIGN KEY(alert_id) REFERENCES price_alerts(id)
        )`);

        console.log('✅ Tablolar oluşturuldu/kontrol edildi');

        updateAsset(id, {
            quantity: newQuantity
        });

        createTransaction({
            asset_id: id,
            type: 'sell',
            quantity: quantity,
            price: price,
            realized_profit: realizedProfit
        });

        console.log(`✅ Satış işlemi: ${asset.name} - ${quantity} @ ${price} (Kar: ${realizedProfit.toFixed(2)})`);
        return getAssetById(id);
    } catch (error) {
        console.error('❌ Satış işlemi hatası:', error);
        throw new Error('Satış işlemi başarısız: ' + error.message);
    }
}

// ==========================
// TRANSACTION İşlemleri
// ==========================

function createTransaction(tx) {
    try {
        // Validasyon
        ConstraintValidator.validateQuantity(tx.quantity);
        ConstraintValidator.validatePrice(tx.price);

        const total = tx.quantity * tx.price;
        const realizedProfit = tx.realized_profit || 0;

        db.run(`
            INSERT INTO transactions (asset_id, type, quantity, price, total, realized_profit)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [tx.asset_id, tx.type, tx.quantity, tx.price, total, realizedProfit]);

        saveDatabase();
        return { ...tx, total, realized_profit: realizedProfit };
    } catch (error) {
        console.error('❌ Transaction oluşturma hatası:', error);
        throw new Error('Transaction oluşturulamadı: ' + error.message);
    }
}

function getAllTransactions() {
    const stmt = db.prepare(`
        SELECT t.*, a.name as asset_name, a.symbol as asset_symbol
        FROM transactions t
        LEFT JOIN assets a ON t.asset_id = a.id
        ORDER BY t.date DESC
        LIMIT 100
    `);

    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function getTransactionsByAsset(assetId) {
    const stmt = db.prepare('SELECT * FROM transactions WHERE asset_id = ? ORDER BY date DESC');
    stmt.bind([assetId]);

    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

// ==========================
// PORTFÖY ÖZETİ
// ==========================

function getPortfolioSummary() {
    const assets = getAllAssets();

    let totalValue = 0;
    let totalCost = 0;

    for (const asset of assets) {
        totalValue += asset.quantity * asset.current_price;
        totalCost += asset.quantity * asset.avg_cost;
    }

    // Gerçekleşmiş kâr/zarar hesapla (satış işlemlerinden)
    let totalRealizedProfit = 0;
    try {
        const realizedStmt = db.prepare('SELECT SUM(realized_profit) as total FROM transactions WHERE type = ?');
        realizedStmt.bind(['sell']);
        if (realizedStmt.step()) {
            totalRealizedProfit = realizedStmt.getAsObject().total || 0;
        }
        realizedStmt.free();
    } catch (error) {
        // realized_profit kolonu yoksa, 0 kullan
        console.warn('realized_profit kolonu bulunamadı, 0 kullanılıyor');
        totalRealizedProfit = 0;
    }

    // Gerçekleşmemiş kâr (aktif portföy)
    const unrealizedProfit = totalValue - totalCost;
    const totalProfitLossPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    return {
        total_value: totalValue,
        total_cost: totalCost,
        total_profit_loss: unrealizedProfit,
        total_profit_loss_percent: totalProfitLossPercent,
        total_realized_profit: totalRealizedProfit,
        total_unrealized_profit: unrealizedProfit,
        asset_count: assets.length
    };
}

// Tüm verileri temizle
function clearAllData() {
    try {
        db.run('DELETE FROM transactions');
        db.run('DELETE FROM assets');
        db.run('DELETE FROM sqlite_sequence WHERE name IN ("assets", "transactions")');
        saveDatabase();
        console.log('✅ Tüm veriler temizlendi');
        return { success: true };
    } catch (error) {
        console.error('❌ Veri temizleme hatası:', error);
        throw new Error('Veriler temizlenemedi: ' + error.message);
    }
}

// Veri bütünlüğü kontrolü
function checkDataIntegrity() {
    const { DataIntegrityChecker } = require('./middleware/transaction');
    const checker = new DataIntegrityChecker(db);
    return checker.runAllChecks();
}

// Veri bütünlüğü otomatik düzeltme
function autoFixDataIntegrity() {
    const { DataIntegrityChecker } = require('./middleware/transaction');
    const checker = new DataIntegrityChecker(db);
    return checker.autoFix();
}

// Veritabanı backup
function backupDatabase(backupPath) {
    try {
        if (!backupPath) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            backupPath = path.join(__dirname, `backups/portfolio-${timestamp}.db`);
        }

        const backupDir = path.dirname(backupPath);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        fs.copyFileSync(DB_PATH, backupPath);
        console.log(`✅ Backup oluşturuldu: ${backupPath}`);
        return backupPath;
    } catch (error) {
        console.error('❌ Backup hatası:', error);
        throw new Error('Backup oluşturulamadı: ' + error.message);
    }
}

// Veritabanı restore
function restoreDatabase(backupPath) {
    try {
        if (!fs.existsSync(backupPath)) {
            throw new Error('Backup dosyası bulunamadı');
        }

        fs.copyFileSync(backupPath, DB_PATH);
        console.log(`✅ Backup restore edildi: ${backupPath}`);

        // Veritabanını yeniden yükle
        const fileBuffer = fs.readFileSync(DB_PATH);
        const SQL = require('sql.js');
        db = new SQL.Database(fileBuffer);

        return { success: true };
    } catch (error) {
        console.error('❌ Restore hatası:', error);
        throw new Error('Restore başarısız: ' + error.message);
    }
}

module.exports = {
    initDatabase,
    getAllAssets,
    getAssetById,
    createAsset,
    updateAsset,
    deleteAsset,
    buyAsset,
    sellAsset,
    createTransaction,
    getAllTransactions,
    getTransactionsByAsset,
    getPortfolioSummary,
    clearAllData,
    checkDataIntegrity,
    autoFixDataIntegrity,

    getAllTransactions: () => {
        try {
            const stmt = db.prepare("SELECT * FROM transactions ORDER BY date DESC");
            const res = [];
            while (stmt.step()) res.push(stmt.getAsObject());
            stmt.free();
            return res;
        } catch (e) { return []; }
    },

    // Alerts
    createAlert: (alert) => {
        const stmt = db.prepare(`
            INSERT INTO price_alerts (asset_symbol, alert_type, threshold_value, current_price, is_active)
            VALUES (@symbol, @type, @threshold, @current, 1)
        `);
        const result = stmt.run({
            '@symbol': alert.symbol,
            '@type': alert.type,
            '@threshold': alert.threshold,
            '@current': alert.currentPrice || 0
        });
        return { id: result.lastInsertRowid, ...alert };
    },

    getAllAlerts: () => {
        try {
            const stmt = db.prepare("SELECT * FROM price_alerts WHERE is_active = 1 ORDER BY created_at DESC");
            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            stmt.free();
            return results;
        } catch (error) {
            console.error('getAllAlerts error:', error);
            return [];
        }
    },

    deleteAlert: (id) => {
        const stmt = db.prepare("UPDATE price_alerts SET is_active = 0 WHERE id = ?");
        return stmt.run(id);
    },

    logAlertHistory: (alertId, triggerPrice, message) => {
        const stmt = db.prepare(`
            INSERT INTO alert_history (alert_id, trigger_price, message)
            VALUES (?, ?, ?)
        `);
        stmt.run(alertId, triggerPrice, message);
    },
    backupDatabase,
    restoreDatabase
};
