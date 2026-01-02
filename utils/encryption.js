const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-gcm';
// In production, this should be in .env. We use a default for demo.
const SECRET_KEY = process.env.BACKUP_ENCRYPTION_KEY
    ? crypto.createHash('sha256').update(String(process.env.BACKUP_ENCRYPTION_KEY)).digest()
    : crypto.createHash('sha256').update('DEFAULT_SECURE_KEY_PLEASE_CHANGE').digest();

const IV_LENGTH = 12; // Recommended for GCM

module.exports = {
    encrypt: (text) => {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return iv.toString('hex') + ':' + encrypted + ':' + authTag;
    },

    decrypt: (text) => {
        try {
            const parts = text.split(':');
            // Legacy or simple check
            if (parts.length !== 3) return null;

            const iv = Buffer.from(parts[0], 'hex');
            const encryptedText = Buffer.from(parts[1], 'hex');
            const authTag = Buffer.from(parts[2], 'hex');

            const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            // Return null for any decryption errors (invalid data, wrong key, etc.)
            return null;
        }
    },

    encryptFile: (inputPath, outputPath) => {
        return new Promise((resolve, reject) => {
            const iv = crypto.randomBytes(IV_LENGTH);
            const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
            const input = fs.createReadStream(inputPath);
            const output = fs.createWriteStream(outputPath);

            output.write(iv); // Prepend IV

            input.pipe(cipher).pipe(output);

            output.on('finish', () => {
                // For GCM authentication tag, usually it's appended or stored separate. 
                // With streams and GCM, getting auth tag *after* finish is standard but appending it to stream 
                // is tricky because pipe flow is done.
                // Simplified approach for file backup: Use 'aes-256-cbc' for simpler stream handling if auth not strictly strict,
                // OR handle GCM tag appending by listening to encryption end.

                // Let's stick to spec 'aes-256-gcm' but we need to append authTag.
                const authTag = cipher.getAuthTag();
                fs.appendFileSync(outputPath, authTag); // Append tag at end
                resolve({ iv: iv.toString('hex'), tag: authTag.toString('hex') });
            });

            input.on('error', reject);
            output.on('error', reject);
        });
    },

    decryptFile: (inputPath, outputPath) => {
        return new Promise((resolve, reject) => {
            // This is complex with GCM streams because we need IV (start) and Tag (end)
            // Simpler approach for this task: Read file buffer, decrypt, write.
            // Since portfolio db is small (<100MB likely), sync check is okay-ish or buffer.
            // But let's implementing a robust stream is out of quick scope.
            // We will implement read-all for decrypt to ensure correctness of tag.

            try {
                const fileBuffer = fs.readFileSync(inputPath);
                const iv = fileBuffer.slice(0, IV_LENGTH);
                const tagLength = 16;
                const tag = fileBuffer.slice(fileBuffer.length - tagLength);
                const content = fileBuffer.slice(IV_LENGTH, fileBuffer.length - tagLength);

                const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
                decipher.setAuthTag(tag);

                const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
                fs.writeFileSync(outputPath, decrypted);
                resolve(true);
            } catch (e) {
                reject(e);
            }
        });
    }
};
