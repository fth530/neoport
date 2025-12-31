/**
 * Transaction Management Middleware
 * Veritabanı işlemlerinde atomicity sağlar
 */

class TransactionManager {
    constructor(db) {
        this.db = db;
        this.inTransaction = false;
    }

    // Transaction başlat
    begin() {
        if (this.inTransaction) {
            throw new Error('Transaction zaten aktif');
        }
        
        try {
            this.db.run('BEGIN TRANSACTION');
            this.inTransaction = true;
            console.log('🔄 Transaction başlatıldı');
        } catch (error) {
            console.error('❌ Transaction başlatma hatası:', error);
            throw error;
        }
    }

    // Transaction commit
    commit() {
        if (!this.inTransaction) {
            throw new Error('Aktif transaction yok');
        }
        
        try {
            this.db.run('COMMIT');
            this.inTransaction = false;
            console.log('✅ Transaction commit edildi');
        } catch (error) {
            console.error('❌ Transaction commit hatası:', error);
            this.rollback();
            throw error;
        }
    }

    // Transaction rollback
    rollback() {
        if (!this.inTransaction) {
            return;
        }
        
        try {
            this.db.run('ROLLBACK');
            this.inTransaction = false;
            console.log('↩️ Transaction rollback yapıldı');
        } catch (error) {
            console.error('❌ Transaction rollback hatası:', error);
            throw error;
        }
    }

    // Transaction wrapper
    async execute(callback) {
        this.begin();
        
        try {
            const result = await callback();
            this.commit();
            return result;
        } catch (error) {
            this.rollback();
            throw error;
        }
    }
}

// Constraint validation
class ConstraintValidator {
    // Miktar kontrolü
    static validateQuantity(quantity, min = 0, max = 1000000000) {
        if (typeof quantity !== 'number' || isNaN(quantity)) {
            throw new Error('Miktar geçerli bir sayı olmalıdır');
        }
        
        if (quantity < min) {
            throw new Error(`Miktar ${min} değerinden küçük olamaz`);
        }
        
        if (quantity > max) {
            throw new Error(`Miktar ${max} değerinden büyük olamaz`);
        }
        
        return true;
    }

    // Fiyat kontrolü
    static validatePrice(price, min = 0, max = 1000000000) {
        if (typeof price !== 'number' || isNaN(price)) {
            throw new Error('Fiyat geçerli bir sayı olmalıdır');
        }
        
        if (price < min) {
            throw new Error(`Fiyat ${min} değerinden küçük olamaz`);
        }
        
        if (price > max) {
            throw new Error(`Fiyat ${max} değerinden büyük olamaz`);
        }
        
        return true;
    }

    // Yetersiz bakiye kontrolü
    static validateSufficientBalance(available, required) {
        if (required > available) {
            throw new Error(`Yetersiz miktar. Mevcut: ${available}, Gerekli: ${required}`);
        }
        
        return true;
    }

    // Varlık varlığı kontrolü
    static validateAssetExists(asset, id) {
        if (!asset) {
            throw new Error(`Varlık bulunamadı (ID: ${id})`);
        }
        
        return true;
    }

    // Duplicate kontrolü
    static validateUnique(items, field, value, errorMsg) {
        const exists = items.some(item => item[field] === value);
        
        if (exists) {
            throw new Error(errorMsg || `${field} zaten mevcut: ${value}`);
        }
        
        return true;
    }

    // Referential integrity
    static validateForeignKey(parentExists, childId, parentType) {
        if (!parentExists) {
            throw new Error(`${parentType} bulunamadı (ID: ${childId})`);
        }
        
        return true;
    }
}

// Data integrity checker
class DataIntegrityChecker {
    constructor(db) {
        this.db = db;
    }

    // Orphan transaction kontrolü
    checkOrphanTransactions() {
        const stmt = this.db.prepare(`
            SELECT t.id, t.asset_id 
            FROM transactions t 
            LEFT JOIN assets a ON t.asset_id = a.id 
            WHERE a.id IS NULL
        `);
        
        const orphans = [];
        while (stmt.step()) {
            orphans.push(stmt.getAsObject());
        }
        stmt.free();
        
        if (orphans.length > 0) {
            console.warn(`⚠️ ${orphans.length} orphan transaction bulundu`);
            return orphans;
        }
        
        console.log('✅ Orphan transaction yok');
        return [];
    }

    // Negatif miktar kontrolü
    checkNegativeQuantities() {
        const stmt = this.db.prepare(`
            SELECT id, name, quantity 
            FROM assets 
            WHERE quantity < 0
        `);
        
        const negatives = [];
        while (stmt.step()) {
            negatives.push(stmt.getAsObject());
        }
        stmt.free();
        
        if (negatives.length > 0) {
            console.error(`❌ ${negatives.length} negatif miktar bulundu`);
            return negatives;
        }
        
        console.log('✅ Negatif miktar yok');
        return [];
    }

    // Tutarsız ortalama maliyet kontrolü
    checkInconsistentAverageCost() {
        const stmt = this.db.prepare(`
            SELECT 
                a.id, 
                a.name, 
                a.avg_cost as stored_avg_cost,
                COALESCE(SUM(CASE WHEN t.type = 'buy' THEN t.total ELSE 0 END) / 
                         NULLIF(SUM(CASE WHEN t.type = 'buy' THEN t.quantity ELSE 0 END), 0), 0) as calculated_avg_cost
            FROM assets a
            LEFT JOIN transactions t ON a.id = t.asset_id
            GROUP BY a.id
            HAVING ABS(stored_avg_cost - calculated_avg_cost) > 0.01
        `);
        
        const inconsistent = [];
        while (stmt.step()) {
            inconsistent.push(stmt.getAsObject());
        }
        stmt.free();
        
        if (inconsistent.length > 0) {
            console.warn(`⚠️ ${inconsistent.length} tutarsız ortalama maliyet bulundu`);
            return inconsistent;
        }
        
        console.log('✅ Ortalama maliyet tutarlı');
        return [];
    }

    // Tüm kontrolleri çalıştır
    runAllChecks() {
        console.log('\n🔍 Veri bütünlüğü kontrolü başlıyor...\n');
        
        const results = {
            orphanTransactions: this.checkOrphanTransactions(),
            negativeQuantities: this.checkNegativeQuantities(),
            inconsistentAverageCost: this.checkInconsistentAverageCost()
        };
        
        const totalIssues = 
            results.orphanTransactions.length +
            results.negativeQuantities.length +
            results.inconsistentAverageCost.length;
        
        if (totalIssues === 0) {
            console.log('\n✅ Veri bütünlüğü kontrolü başarılı - Sorun bulunamadı\n');
        } else {
            console.warn(`\n⚠️ Veri bütünlüğü kontrolü tamamlandı - ${totalIssues} sorun bulundu\n`);
        }
        
        return results;
    }

    // Sorunları otomatik düzelt
    autoFix() {
        console.log('\n🔧 Otomatik düzeltme başlıyor...\n');
        
        let fixed = 0;
        
        // Orphan transaction'ları sil
        const orphans = this.checkOrphanTransactions();
        if (orphans.length > 0) {
            orphans.forEach(orphan => {
                this.db.run('DELETE FROM transactions WHERE id = ?', [orphan.id]);
                fixed++;
            });
            console.log(`✅ ${orphans.length} orphan transaction silindi`);
        }
        
        // Negatif miktarları 0'a çek
        const negatives = this.checkNegativeQuantities();
        if (negatives.length > 0) {
            negatives.forEach(negative => {
                this.db.run('UPDATE assets SET quantity = 0 WHERE id = ?', [negative.id]);
                fixed++;
            });
            console.log(`✅ ${negatives.length} negatif miktar düzeltildi`);
        }
        
        console.log(`\n✅ Toplam ${fixed} sorun düzeltildi\n`);
        
        return fixed;
    }
}

module.exports = {
    TransactionManager,
    ConstraintValidator,
    DataIntegrityChecker
};
