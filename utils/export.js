/**
 * Export/Import Utilities
 * CSV ve JSON formatında veri export/import
 */

// JSON'a çevir
function toJSON(data) {
    return JSON.stringify(data, null, 2);
}

// CSV'ye çevir
function toCSV(data, headers) {
    if (!data || data.length === 0) {
        return '';
    }

    // Header'ları belirle
    const keys = headers || Object.keys(data[0]);
    const csvHeaders = keys.join(',');

    // Satırları oluştur
    const csvRows = data.map(row => {
        return keys.map(key => {
            const value = row[key];
            // Virgül veya tırnak içeren değerleri escape et
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
        }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
}

// CSV'den parse et
function fromCSV(csvString) {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('Geçersiz CSV formatı');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        
        headers.forEach((header, index) => {
            let value = values[index];
            
            // Tırnak işaretlerini temizle
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1).replace(/""/g, '"');
            }
            
            // Sayıya çevir
            if (!isNaN(value) && value !== '') {
                value = parseFloat(value);
            }
            
            row[header] = value;
        });
        
        data.push(row);
    }

    return data;
}

// Varlıkları export et
function exportAssets(assets, format = 'json') {
    if (format === 'csv') {
        const headers = ['id', 'name', 'symbol', 'type', 'quantity', 'avg_cost', 'current_price', 'currency'];
        return toCSV(assets, headers);
    }
    return toJSON(assets);
}

// İşlemleri export et
function exportTransactions(transactions, format = 'json') {
    if (format === 'csv') {
        const headers = ['id', 'asset_id', 'asset_name', 'type', 'quantity', 'price', 'total', 'realized_profit', 'date'];
        return toCSV(transactions, headers);
    }
    return toJSON(transactions);
}

// Portföy özetini export et
function exportSummary(summary, assets, transactions, format = 'json') {
    const exportData = {
        summary,
        assets,
        transactions,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };

    if (format === 'csv') {
        // CSV için ayrı ayrı export et
        return {
            summary: toCSV([summary]),
            assets: exportAssets(assets, 'csv'),
            transactions: exportTransactions(transactions, 'csv')
        };
    }

    return toJSON(exportData);
}

// Varlıkları import et
function importAssets(data, format = 'json') {
    let assets;
    
    if (format === 'csv') {
        assets = fromCSV(data);
    } else {
        assets = JSON.parse(data);
    }

    // Validasyon
    assets.forEach(asset => {
        if (!asset.name || !asset.symbol || !asset.type) {
            throw new Error('Geçersiz varlık verisi: name, symbol ve type gerekli');
        }
    });

    return assets;
}

// Tam portföy import et
function importPortfolio(data) {
    const portfolio = JSON.parse(data);
    
    if (!portfolio.assets || !portfolio.transactions) {
        throw new Error('Geçersiz portföy verisi');
    }

    return portfolio;
}

module.exports = {
    toJSON,
    toCSV,
    fromCSV,
    exportAssets,
    exportTransactions,
    exportSummary,
    importAssets,
    importPortfolio
};
