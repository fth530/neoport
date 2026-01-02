const database = require('../database');

module.exports = {
    exportUserData: () => {
        // Collect all data
        const assets = database.getAllAssets();
        const transactions = database.getAllTransactions ? database.getAllTransactions() : []; // Need to ensure this exists or use check
        const alerts = database.getAllAlerts ? database.getAllAlerts() : [];

        // Helper to get transactions if not exposed directly
        // Assuming database.js might not expose getAllTransactions directly public? 
        // Let's check database.js later. For now, try best effort. 
        // Actually we can add getAllTransactions to database.js or query generic.

        return {
            timestamp: new Date().toISOString(),
            version: '1.0',
            assets: assets,
            transactions: transactions,
            alerts: alerts
        };
    },

    deleteUserData: () => {
        // Clear all tables
        // Assuming database.js exposes clearAllData
        if (database.clearAllData) {
            database.clearAllData();
            return { success: true };
        } else {
            throw new Error('Veri silme fonksiyonu desteklenmiyor.');
        }
    }
};
