const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');
const { ConstraintValidator } = require('./middleware/transaction');

const DB_PATH = path.join(__dirname, 'portfolio.db');

let db = null;

// Veritabanını başlat
async function initDatabase() {
    try {
        const SQL = await initSqlJs();

        // Mevcut veritabanı dosyası varsa yükle
        if (fs.existsSync(DB_PATH)) {
            try {
                const fileBuffer = fs.readFileSync(DB_PATH);
                db = new SQL.Database(fileBuffer);
                console.log('✅ Mevcut veritabanı yüklendi');
            } catch (error) {
                console.error('⚠️ Veritabanı dosyası bozuk, yeni oluşturuluyor:', error.message);
                db = new SQL.Database();
            }
        } else {
            db = new SQL.Database();
            console.log('✅ Yeni veritabanı oluşturuldu');
        }

        // Tabloları oluştur
        db.run(`
            CREATE TABLE IF NOT EXISTS assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL CHECK(length(name) > 0 AND length(name) <= 100),
                symbol TEXT NOT NULL CHECK(length(symbol) > 0 AND length(symbol) <= 20),
                type TEXT NOT NULL CHECK(type IN ('crypto', 'stock', 'gold', 'currency')),
                quantity REAL NOT NULL DEFAULT 0 CHECK(quantity >= 0),
                avg_cost REAL NOT NULL DEFAULT 0 CHECK(avg_cost >= 0),
                current_price REAL DEFAULT 0 CHECK(current_price >= 0),
                currency TEXT DEFAULT 'TRY' CHECK(currency IN ('TRY', 'USD', 'EUR')),
                icon TEXT DEFAULT 'fa-solid fa-coins',
                icon_bg TEXT DEFAULT 'gray',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(symbol, type)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_id INTEGER NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('buy', 'sell')),
                quantity REAL NOT NULL CHECK(quantity > 0),
                price REAL NOT NULL CHECK(price >= 0),
                total REAL NOT NULL CHECK(total >= 0),
                realized_profit REAL DEFAULT 0,
                date TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
            )
        `);

        // Index'ler oluştur (performans için)
        db.run('CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type)');
        db.run('CREATE INDEX IF NOT EXISTS idx_assets_symbol ON assets(symbol)');
        db.run('CREATE INDEX IF NOT EXISTS idx_transactions_asset_id ON transactions(asset_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)');

        saveDatabase();
        console.log('✅ Veritabanı başarıyla başlatıldı');
        return db;
    } catch (error) {
        console.error('❌ Veritabanı başlatma hatası:', error);
        throw new Error('Veritabanı başlatılamadı: ' + error.message);
    }
}

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
    const realizedStmt = db.prepare('SELECT SUM(realized_profit) as total FROM transactions WHERE type = ?');
    realizedStmt.bind(['sell']);
    let totalRealizedProfit = 0;
    if (realizedStmt.step()) {
        totalRealizedProfit = realizedStmt.getAsObject().total || 0;
    }
    realizedStmt.free();

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
    backupDatabase,
    restoreDatabase
};
