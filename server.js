require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const priceService = require('./priceService');
const logger = require('./utils/logger');
const { sanitizeAll } = require('./middleware/sanitize');
const {
    validateCreateAsset,
    validateUpdateAsset,
    validateTransaction,
    validateId
} = require('./middleware/validate');
const { responseTime, trackMetrics, metrics } = require('./middleware/performance');
const { cacheMiddleware, invalidateCache } = require('./middleware/cache');
const { asyncHandler, errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const exportUtils = require('./utils/export');
const reportUtils = require('./utils/reports');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// =====================
// SECURITY MIDDLEWARE
// =====================

// Helmet - Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.coingecko.com", "https://finnhub.io", "https://open.er-api.com"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// =====================
// SWAGGER API DOCUMENTATION
// =====================

// Swagger UI options
const swaggerUiOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Portfolio API Docs',
    customfavIcon: '/favicon.ico'
};

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// =====================
// PERFORMANCE MIDDLEWARE
// =====================

// Compression - Gzip/Deflate
app.use(compression({
    level: 6, // Compression level (0-9)
    threshold: 1024, // Minimum size to compress (1KB)
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// Response time tracking
app.use(responseTime);

// Metrics tracking
app.use(trackMetrics);

// CORS Configuration
const corsOptions = {
    origin: NODE_ENV === 'production' 
        ? process.env.CORS_ORIGIN 
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        error: 'Çok fazla istek gönderildi',
        details: 'Lütfen daha sonra tekrar deneyin'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`⚠️ Rate limit exceeded: ${req.ip}`);
        res.status(429).json({
            error: 'Çok fazla istek',
            message: 'Lütfen bir süre bekleyip tekrar deneyin',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Stricter rate limit for price refresh (expensive operation)
const priceRefreshLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 requests per 5 minutes
    message: {
        error: 'Fiyat güncelleme limiti aşıldı',
        details: 'Lütfen 5 dakika bekleyin'
    }
});

// Body parser with size limit
app.use(express.json({ 
    limit: '1mb',
    strict: true
}));

app.use(express.urlencoded({ 
    extended: true, 
    limit: '1mb' 
}));

// Input sanitization
app.use('/api/', sanitizeAll);

// Serve static files
app.use(express.static(__dirname, {
    maxAge: NODE_ENV === 'production' ? '1d' : 0,
    etag: true
}));

// Request logging middleware
app.use(logger.requestLogger());

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Not found handler (must be after all routes)
// app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

let db;

// Veritabanını başlat ve sunucuyu çalıştır
async function startServer() {
    const database = require('./database');
    await database.initDatabase();
    db = database;

    // =====================
    // API ROUTES
    // =====================

    // Health check endpoint
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            memory: process.memoryUsage(),
            env: NODE_ENV
        });
    });

    // Performance metrics endpoint
    app.get('/api/metrics', (req, res) => {
        res.json(metrics.getStats());
    });

    // Portföy özeti (cache: 30 saniye)
    app.get('/api/summary', cacheMiddleware(30000), asyncHandler(async (req, res) => {
        const summary = db.getPortfolioSummary();
        res.json(summary);
    }));

    // Tüm varlıkları listele (cache: 10 saniye)
    app.get('/api/assets', cacheMiddleware(10000), asyncHandler(async (req, res) => {
        const assets = db.getAllAssets();
        res.json(assets);
    }));

    // Tek varlık getir
    app.get('/api/assets/:id', validateId, (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const asset = db.getAssetById(id);
            if (!asset) {
                return res.status(404).json({ error: 'Varlık bulunamadı' });
            }
            res.json(asset);
        } catch (error) {
            console.error('Varlık getirme hatası:', error);
            res.status(500).json({ 
                error: 'Varlık getirilemedi',
                details: error.message 
            });
        }
    });

    // Yeni varlık ekle
    app.post('/api/assets', validateCreateAsset, (req, res) => {
        try {
            const { name, symbol, type, quantity, avg_cost, currency, icon, icon_bg } = req.body;

            const parsedQuantity = parseFloat(quantity) || 0;
            const parsedAvgCost = parseFloat(avg_cost) || 0;

            const asset = db.createAsset({
                name: name.trim(),
                symbol: symbol.trim().toUpperCase(),
                type,
                quantity: parsedQuantity,
                avg_cost: parsedAvgCost,
                current_price: parsedAvgCost,
                currency: currency || 'TRY',
                icon: icon || 'fa-solid fa-coins',
                icon_bg: icon_bg || 'gray'
            });

            // Cache'i invalidate et
            invalidateCache('/api/assets');
            invalidateCache('/api/summary');

            res.status(201).json(asset);
        } catch (error) {
            console.error('Varlık ekleme hatası:', error);
            res.status(500).json({ 
                error: 'Varlık eklenemedi',
                details: error.message 
            });
        }
    });

    // Varlık güncelle
    app.put('/api/assets/:id', validateUpdateAsset, (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const asset = db.updateAsset(id, req.body);

            if (!asset) {
                return res.status(404).json({ error: 'Varlık bulunamadı' });
            }

            // Cache'i invalidate et
            invalidateCache('/api/assets');
            invalidateCache('/api/summary');

            res.json(asset);
        } catch (error) {
            console.error('Varlık güncelleme hatası:', error);
            res.status(500).json({ 
                error: 'Varlık güncellenemedi',
                details: error.message 
            });
        }
    });

    // Varlık sil
    app.delete('/api/assets/:id', validateId, (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const asset = db.getAssetById(id);
            if (!asset) {
                return res.status(404).json({ error: 'Varlık bulunamadı' });
            }

            db.deleteAsset(id);

            // Cache'i invalidate et
            invalidateCache('/api/assets');
            invalidateCache('/api/summary');

            res.json({ 
                success: true, 
                message: `${asset.name} silindi` 
            });
        } catch (error) {
            console.error('Varlık silme hatası:', error);
            res.status(500).json({ 
                error: 'Varlık silinemedi',
                details: error.message 
            });
        }
    });

    // Alım işlemi
    app.post('/api/assets/:id/buy', validateTransaction, (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { quantity, price } = req.body;

            const parsedQuantity = parseFloat(quantity);
            const parsedPrice = parseFloat(price);

            const asset = db.buyAsset(id, parsedQuantity, parsedPrice);

            if (!asset) {
                return res.status(404).json({ error: 'Varlık bulunamadı' });
            }

            // Cache'i invalidate et
            invalidateCache('/api/assets');
            invalidateCache('/api/summary');
            invalidateCache('/api/transactions');

            res.json(asset);
        } catch (error) {
            console.error('Alım işlemi hatası:', error);
            res.status(500).json({ 
                error: 'Alım işlemi başarısız',
                details: error.message 
            });
        }
    });

    // Satış işlemi
    app.post('/api/assets/:id/sell', validateTransaction, (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { quantity, price } = req.body;

            const parsedQuantity = parseFloat(quantity);
            const parsedPrice = parseFloat(price);

            const result = db.sellAsset(id, parsedQuantity, parsedPrice);

            if (!result) {
                return res.status(404).json({ error: 'Varlık bulunamadı' });
            }

            if (result.error) {
                return res.status(400).json(result);
            }

            // Cache'i invalidate et
            invalidateCache('/api/assets');
            invalidateCache('/api/summary');
            invalidateCache('/api/transactions');

            res.json(result);
        } catch (error) {
            console.error('Satış işlemi hatası:', error);
            res.status(500).json({ 
                error: 'Satış işlemi başarısız',
                details: error.message 
            });
        }
    });

    // İşlem geçmişi (cache: 30 saniye)
    app.get('/api/transactions', cacheMiddleware(30000), (req, res) => {
        try {
            const transactions = db.getAllTransactions();
            res.json(transactions);
        } catch (error) {
            console.error('İşlem geçmişi hatası:', error);
            res.status(500).json({ 
                error: 'İşlem geçmişi alınamadı',
                details: error.message 
            });
        }
    });

    // Belirli varlığın işlemleri
    app.get('/api/assets/:id/transactions', validateId, (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const transactions = db.getTransactionsByAsset(id);
            res.json(transactions);
        } catch (error) {
            console.error('Varlık işlemleri hatası:', error);
            res.status(500).json({ 
                error: 'İşlemler alınamadı',
                details: error.message 
            });
        }
    });

    // Tüm verileri temizle
    app.delete('/api/clear', (req, res) => {
        try {
            db.clearAllData();
            res.json({ 
                success: true, 
                message: 'Tüm veriler silindi' 
            });
        } catch (error) {
            console.error('Veri temizleme hatası:', error);
            res.status(500).json({ 
                error: 'Veriler temizlenemedi',
                details: error.message 
            });
        }
    });

    // Veri bütünlüğü kontrolü
    app.get('/api/integrity/check', (req, res) => {
        try {
            const results = db.checkDataIntegrity();
            const totalIssues = 
                results.orphanTransactions.length +
                results.negativeQuantities.length +
                results.inconsistentAverageCost.length;
            
            res.json({
                success: true,
                totalIssues,
                results
            });
        } catch (error) {
            console.error('Veri bütünlüğü kontrolü hatası:', error);
            res.status(500).json({
                error: 'Veri bütünlüğü kontrolü başarısız',
                details: error.message
            });
        }
    });

    // Veri bütünlüğü otomatik düzeltme
    app.post('/api/integrity/fix', (req, res) => {
        try {
            const fixed = db.autoFixDataIntegrity();
            res.json({
                success: true,
                message: `${fixed} sorun düzeltildi`,
                fixed
            });
        } catch (error) {
            console.error('Veri bütünlüğü düzeltme hatası:', error);
            res.status(500).json({
                error: 'Veri bütünlüğü düzeltme başarısız',
                details: error.message
            });
        }
    });

    // Veritabanı backup
    app.post('/api/backup', (req, res) => {
        try {
            const backupPath = db.backupDatabase();
            res.json({
                success: true,
                message: 'Backup oluşturuldu',
                path: backupPath
            });
        } catch (error) {
            console.error('Backup hatası:', error);
            res.status(500).json({
                error: 'Backup oluşturulamadı',
                details: error.message
            });
        }
    });

    // Veritabanı restore
    app.post('/api/restore', (req, res) => {
        try {
            const { backupPath } = req.body;
            if (!backupPath) {
                return res.status(400).json({ error: 'Backup path gerekli' });
            }
            
            db.restoreDatabase(backupPath);
            res.json({
                success: true,
                message: 'Backup restore edildi'
            });
        } catch (error) {
            console.error('Restore hatası:', error);
            res.status(500).json({
                error: 'Restore başarısız',
                details: error.message
            });
        }
    });

    // =====================
    // EXPORT/IMPORT ROUTES
    // =====================

    // Export varlıklar
    app.get('/api/export/assets', (req, res) => {
        try {
            const format = req.query.format || 'json';
            const assets = db.getAllAssets();
            const data = exportUtils.exportAssets(assets, format);
            
            const filename = `assets-${new Date().toISOString().split('T')[0]}.${format}`;
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
            res.send(data);
        } catch (error) {
            console.error('Export hatası:', error);
            res.status(500).json({
                error: 'Export başarısız',
                details: error.message
            });
        }
    });

    // Export işlemler
    app.get('/api/export/transactions', (req, res) => {
        try {
            const format = req.query.format || 'json';
            const transactions = db.getAllTransactions();
            const data = exportUtils.exportTransactions(transactions, format);
            
            const filename = `transactions-${new Date().toISOString().split('T')[0]}.${format}`;
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
            res.send(data);
        } catch (error) {
            console.error('Export hatası:', error);
            res.status(500).json({
                error: 'Export başarısız',
                details: error.message
            });
        }
    });

    // Export tam portföy
    app.get('/api/export/portfolio', (req, res) => {
        try {
            const format = req.query.format || 'json';
            const summary = db.getPortfolioSummary();
            const assets = db.getAllAssets();
            const transactions = db.getAllTransactions();
            const data = exportUtils.exportSummary(summary, assets, transactions, format);
            
            const filename = `portfolio-${new Date().toISOString().split('T')[0]}.${format}`;
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
            res.send(data);
        } catch (error) {
            console.error('Export hatası:', error);
            res.status(500).json({
                error: 'Export başarısız',
                details: error.message
            });
        }
    });

    // Import varlıklar
    app.post('/api/import/assets', (req, res) => {
        try {
            const { data, format } = req.body;
            if (!data) {
                return res.status(400).json({ error: 'Data gerekli' });
            }
            
            let assets;
            try {
                assets = exportUtils.importAssets(data, format || 'json');
            } catch (parseError) {
                // Parse hatası - geçersiz format
                return res.json({
                    success: true,
                    imported: 0,
                    errors: 1,
                    details: {
                        imported: [],
                        errors: [{
                            asset: 'unknown',
                            error: parseError.message
                        }]
                    }
                });
            }
            
            // Varlıkları ekle
            const imported = [];
            const errors = [];
            
            assets.forEach(asset => {
                try {
                    const created = db.createAsset(asset);
                    imported.push(created);
                } catch (error) {
                    errors.push({
                        asset: asset.name || 'unknown',
                        error: error.message
                    });
                }
            });
            
            invalidateCache('/api/assets');
            invalidateCache('/api/summary');
            
            res.json({
                success: true,
                imported: imported.length,
                errors: errors.length,
                details: { imported, errors }
            });
        } catch (error) {
            console.error('Import hatası:', error);
            res.status(500).json({
                error: 'Import başarısız',
                details: error.message
            });
        }
    });

    // =====================
    // REPORTING ROUTES
    // =====================

    // Aylık rapor
    app.get('/api/reports/monthly', (req, res) => {
        try {
            const transactions = db.getAllTransactions();
            const report = reportUtils.getMonthlyReport(transactions);
            res.json(report);
        } catch (error) {
            console.error('Aylık rapor hatası:', error);
            res.status(500).json({
                error: 'Rapor oluşturulamadı',
                details: error.message
            });
        }
    });

    // Varlık performans raporu
    app.get('/api/reports/performance', (req, res) => {
        try {
            const assets = db.getAllAssets();
            const report = reportUtils.getAssetPerformanceReport(assets);
            res.json(report);
        } catch (error) {
            console.error('Performans raporu hatası:', error);
            res.status(500).json({
                error: 'Rapor oluşturulamadı',
                details: error.message
            });
        }
    });

    // Tür dağılım raporu
    app.get('/api/reports/distribution', (req, res) => {
        try {
            const assets = db.getAllAssets();
            const report = reportUtils.getTypeDistributionReport(assets);
            res.json(report);
        } catch (error) {
            console.error('Dağılım raporu hatası:', error);
            res.status(500).json({
                error: 'Rapor oluşturulamadı',
                details: error.message
            });
        }
    });

    // İşlem özeti
    app.get('/api/reports/transactions', (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            let transactions = db.getAllTransactions();
            
            if (startDate || endDate) {
                transactions = reportUtils.filterByDateRange(transactions, startDate, endDate);
            }
            
            const summary = reportUtils.getTransactionSummary(transactions);
            res.json(summary);
        } catch (error) {
            console.error('İşlem özeti hatası:', error);
            res.status(500).json({
                error: 'Rapor oluşturulamadı',
                details: error.message
            });
        }
    });

    // Portföy değer geçmişi
    app.get('/api/reports/history', (req, res) => {
        try {
            const transactions = db.getAllTransactions();
            const assets = db.getAllAssets();
            const history = reportUtils.getPortfolioValueHistory(transactions, assets);
            res.json(history);
        } catch (error) {
            console.error('Geçmiş raporu hatası:', error);
            res.status(500).json({
                error: 'Rapor oluşturulamadı',
                details: error.message
            });
        }
    });

    // En iyi performans gösterenler
    app.get('/api/reports/top-performers', (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 5;
            const assets = db.getAllAssets();
            const performers = reportUtils.getTopPerformers(assets, limit);
            res.json(performers);
        } catch (error) {
            console.error('Top performers raporu hatası:', error);
            res.status(500).json({
                error: 'Rapor oluşturulamadı',
                details: error.message
            });
        }
    });

    // Risk analizi
    app.get('/api/reports/risk', (req, res) => {
        try {
            const assets = db.getAllAssets();
            const analysis = reportUtils.getRiskAnalysis(assets);
            res.json(analysis);
        } catch (error) {
            console.error('Risk analizi hatası:', error);
            res.status(500).json({
                error: 'Analiz oluşturulamadı',
                details: error.message
            });
        }
    });

    // Fiyatları güncelle (harici API'lerden)
    app.post('/api/prices/refresh', priceRefreshLimiter, async (req, res) => {
        try {
            const assets = db.getAllAssets();
            const results = await priceService.updateAllPrices(assets, (id, data) => {
                return db.updateAsset(id, data);
            });

            // Cache'i invalidate et
            invalidateCache('/api/assets');
            invalidateCache('/api/summary');

            res.json({
                success: true,
                message: `${results.updated} varlık güncellendi`,
                ...results
            });
        } catch (error) {
            console.error('❌ Fiyat güncelleme hatası:', error);
            res.status(500).json({ 
                error: 'Fiyat güncelleme başarısız',
                details: error.message 
            });
        }
    });

    // Ana sayfa
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    // Server başlat
    const server = app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════╗
║     💰 Portföy Uygulaması Çalışıyor!       ║
╠════════════════════════════════════════════╣
║  🌐 http://localhost:${PORT}                   ║
║  📊 API: http://localhost:${PORT}/api/assets   ║
║  📚 Docs: http://localhost:${PORT}/api-docs    ║
║  🔒 Güvenlik: Aktif                        ║
║  ⚡ Ortam: ${NODE_ENV.padEnd(28)}║
╚════════════════════════════════════════════╝
        `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('⚠️ SIGTERM sinyali alındı, sunucu kapatılıyor...');
        server.close(() => {
            console.log('✅ Sunucu başarıyla kapatıldı');
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        console.log('\n⚠️ SIGINT sinyali alındı, sunucu kapatılıyor...');
        server.close(() => {
            console.log('✅ Sunucu başarıyla kapatıldı');
            process.exit(0);
        });
    });
}

startServer().catch(console.error);
