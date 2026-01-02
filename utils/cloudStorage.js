const fs = require('fs');
const path = require('path');

const CLOUD_DIR = path.join(__dirname, '../backups/cloud_mock');

module.exports = {
    upload: async (filePath, filename) => {
        // Mock upload: Copy file to cloud_mock folder
        if (!fs.existsSync(CLOUD_DIR)) {
            fs.mkdirSync(CLOUD_DIR, { recursive: true });
        }

        const dest = path.join(CLOUD_DIR, filename);
        fs.copyFileSync(filePath, dest);

        return {
            success: true,
            provider: 'mock_cloud',
            url: dest, // Local path as URL
            timestamp: new Date()
        };
    },

    listFiles: async () => {
        if (!fs.existsSync(CLOUD_DIR)) return [];
        return fs.readdirSync(CLOUD_DIR).map(f => ({ name: f, size: fs.statSync(path.join(CLOUD_DIR, f)).size }));
    }
};
