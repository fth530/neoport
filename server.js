require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
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
const chartUtils = require('./utils/charts');
const analyticsUtils = require('./utils/analytics');
const alertEngine = require('./utils/alertEngine');
const portfolioMonitor = require('./utils/portfolioMonitor');
const backupScheduler = require('./utils/backupScheduler');
const privacyManager = require('./utils/privacyManager');

// Init Scheduler
backupScheduler.init();

const app = express();
const server = http.createServer(app);

// Optimization Middleware
const setCacheHeaders = require('./middleware/cache-headers');
app.use(setCacheHeaders);

// Socket.io Connection Logic
// Socket.io Setup (Duplicate removed)

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// =====================
// SECURITY MIDDLEWARE
// =====================

// GÜVENLİK AYARLARI (Genişletilmiş İzinler)
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "cdn.jsdelivr.net", "cdn.tailwindcss.com", "cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "fonts.googleapis.com", "https://cdnis.cloudflare.com"],
            connectSrc: ["'self'", "https://api.coingecko.com", "https://finnhub.io", "https://open.er-api.com", "https://cdn.jsdelivr.net", "https://cdnis.cloudflare.com", "https://cdnjs.cloudflare.com", "ws://localhost:3000", "wss://localhost:3000", "http://localhost:3000"],
            imgSrc: ["'self'", "data:", "https://assets.coingecko.com", "https://images.finnhub.io", "https://static.finnhub.io"],
            fontSrc: ["'self'", "cdnjs.cloudflare.com", "https://cdnjs.cloudflare.com", "fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    })
);

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

// Health Check (For Docker/K8s)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(compression());
app.use(sanitizeAll);
app.use(responseTime);
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

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: NODE_ENV === 'production' ? process.env.CORS_ORIGIN : '*',
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('🔌 Yeni istemci bağlandı:', socket.id);

    // Join default room
    socket.join('default_room');

    // Send immediate update upon request/connection
    socket.on('request_update', () => {
        console.log('🔄 İstemci fiyat güncellemesi istedi:', socket.id);
        if (db) {
            const assets = db.getAllAssets();
            const summary = db.getPortfolioSummary();
            socket.emit('price_update', {
                type: 'full_update',
                assets: assets,
                summary: summary,
                timestamp: new Date().toISOString()
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ İstemci ayrıldı:', socket.id);
    });
});


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
app.use('/api/v1/', limiter);

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
app.use('/api/v1/', sanitizeAll);

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
    app.get('/api/v1/health', (req, res) => {
        res.json({
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            memory: process.memoryUsage(),
            env: NODE_ENV
        });
    });

    // Performance metrics endpoint
    app.get('/api/v1/metrics', (req, res) => {
        res.json(metrics.getStats());
    });

    // Portföy özeti (cache: 30 saniye)
    app.get('/api/v1/summary', cacheMiddleware(30000), asyncHandler(async (req, res) => {
        const summary = db.getPortfolioSummary();
        res.json(summary);
    }));

    // Tüm varlıkları listele (cache: 10 saniye)
    app.get('/api/v1/assets', cacheMiddleware(10000), asyncHandler(async (req, res) => {
        const assets = db.getAllAssets();
        res.json(assets);
    }));

    // Tek varlık getir
    app.get('/api/v1/assets/:id', validateId, (req, res) => {
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

    // Middleware: Request verilerini normalize et (Türkçe karakterler, String -> Number)
    const normalizeRequest = (req, res, next) => {
        if (req.body) {
            // Tip dönüşümü (TR -> EN)
            const typeMap = { 'Döviz': 'currency', 'Altın': 'gold', 'Hisse Senedi': 'stock', 'Kripto Para': 'crypto' };
            if (req.body.type && typeMap[req.body.type]) {
                req.body.type = typeMap[req.body.type];
            }
            // Sayısal dönüşüm
            ['quantity', 'avg_cost', 'price', 'current_price'].forEach(f => {
                if (req.body[f] !== undefined && req.body[f] !== '') {
                    req.body[f] = Number(req.body[f]);
                }
            });
        }
        next();
    };

    // Yeni varlık ekle
    app.post('/api/v1/assets', normalizeRequest, validateCreateAsset, (req, res) => {
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
            invalidateCache('/api/v1/assets');
            invalidateCache('/api/v1/summary');

            res.status(201).json(asset);
        } catch (error) {
            console.error('Varlık ekleme hatası:', error);
            
            // Duplicate key hatası kontrolü
            if (error.message && error.message.includes('zaten mevcut')) {
                return res.status(409).json({
                    error: 'Bu varlık zaten mevcut',
                    details: error.message
                });
            }
            
            res.status(500).json({
                error: 'Varlık eklenemedi',
                details: error.message
            });
        }
    });

    // Varlık güncelle
    app.put('/api/v1/assets/:id', normalizeRequest, validateUpdateAsset, (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const asset = db.updateAsset(id, req.body);

            if (!asset) {
                return res.status(404).json({ error: 'Varlık bulunamadı' });
            }

            // Cache'i invalidate et
            invalidateCache('/api/v1/assets');
            invalidateCache('/api/v1/summary');

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
    app.delete('/api/v1/assets/:id', validateId, (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const asset = db.getAssetById(id);
            if (!asset) {
                return res.status(404).json({ error: 'Varlık bulunamadı' });
            }

            db.deleteAsset(id);

            // Cache'i invalidate et
            invalidateCache('/api/v1/assets');
            invalidateCache('/api/v1/summary');

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
    app.post('/api/v1/assets/:id/buy', validateTransaction, (req, res) => {
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
            invalidateCache('/api/v1/assets');
            invalidateCache('/api/v1/summary');
            invalidateCache('/api/v1/transactions');

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
    app.post('/api/v1/assets/:id/sell', validateTransaction, (req, res) => {
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
            invalidateCache('/api/v1/assets');
            invalidateCache('/api/v1/summary');
            invalidateCache('/api/v1/transactions');

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
    app.get('/api/v1/transactions', cacheMiddleware(30000), (req, res) => {
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
    app.get('/api/v1/assets/:id/transactions', validateId, (req, res) => {
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
    app.delete('/api/v1/clear', (req, res) => {
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
    app.get('/api/v1/integrity/check', (req, res) => {
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
    app.post('/api/v1/integrity/fix', (req, res) => {
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
    app.post('/api/v1/backup', (req, res) => {
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
    app.post('/api/v1/restore', (req, res) => {
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
    app.get('/api/v1/export/assets', (req, res) => {
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
    app.get('/api/v1/export/transactions', (req, res) => {
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
    app.get('/api/v1/export/portfolio', (req, res) => {
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
    app.post('/api/v1/import/assets', (req, res) => {
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

            invalidateCache('/api/v1/assets');
            invalidateCache('/api/v1/summary');

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
    app.get('/api/v1/reports/monthly', (req, res) => {
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
    app.get('/api/v1/reports/performance', (req, res) => {
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
    app.get('/api/v1/reports/distribution', (req, res) => {
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
    app.get('/api/v1/reports/transactions', (req, res) => {
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
    app.get('/api/v1/reports/history', (req, res) => {
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
    app.get('/api/v1/reports/top-performers', (req, res) => {
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

    // Risk analizi (Legacy)
    app.get('/api/v1/reports/risk', (req, res) => {
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

    // Advanced Analytics - Candlestick Data
    app.get('/api/v1/charts/candlestick/:symbol', (req, res) => {
        try {
            const { symbol } = req.params;
            // Limit days to max 365 to prevent abuse
            const days = Math.min(parseInt(req.query.days) || 30, 365);
            const ohlc = chartUtils.getCandlestickData(symbol, days);
            res.json(ohlc);
        } catch (error) {
            console.error('Candlestick data error:', error);
            res.status(500).json({ error: 'Data generation failed' });
        }
    });

    // Advanced Analytics - Portfolio Risk
    app.get('/api/v1/analytics/risk', (req, res) => {
        try {
            const assets = db.getAllAssets();
            const riskMetrics = analyticsUtils.calculatePortfolioRisk(assets);
            res.json(riskMetrics);
        } catch (error) {
            console.error('Analytics risk error:', error);
            res.status(500).json({ error: 'Risk calculation failed' });
        }
    });

    // =====================
    // ALERT API
    // =====================

    app.get('/api/v1/alerts', (req, res) => {
        try {
            const alerts = db.getAllAlerts();
            res.json(alerts || []);
        } catch (error) {
            console.error('Alerts GET error:', error);
            res.status(500).json({ error: 'Alarmlar getirilemedi', details: error.message });
        }
    });

    app.post('/api/v1/alerts', (req, res) => {
        try {
            const { symbol, type, threshold, currentPrice } = req.body;
            if (!symbol || !type || !threshold) {
                return res.status(400).json({ error: 'Eksik parametre' });
            }
            const alert = db.createAlert({ symbol, type, threshold, currentPrice });
            res.status(201).json(alert);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Alarm oluşturulamadı' });
        }
    });

    app.delete('/api/v1/alerts/:id', (req, res) => {
        try {
            const id = req.params.id;
            db.deleteAlert(id);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Alarm silinemedi' });
        }
    });

    // =====================
    // SECURITY & BACKUP API
    // =====================
    app.post('/api/v1/security/backup', async (req, res) => {
        try {
            const result = await backupScheduler.createBackup();
            res.json({ success: true, backup: result });
        } catch (error) {
            res.status(500).json({ error: 'Yedekleme başarısız' });
        }
    });

    app.get('/api/v1/security/backups', (req, res) => {
        try {
            const backups = backupScheduler.listBackups();
            res.json(backups);
        } catch (error) {
            res.status(500).json({ error: 'Yedekler listelenemedi' });
        }
    });

    app.post('/api/v1/security/restore', async (req, res) => {
        try {
            const { filename } = req.body;
            if (!filename) return res.status(400).json({ error: 'Dosya adı gerekli' });

            await backupScheduler.restoreBackup(filename);
            res.json({ success: true, message: 'Yedek yüklendi. Lütfen sunucuyu yeniden başlatın.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Geri yükleme başarısız' });
        }
    });

    app.get('/api/v1/privacy/export', (req, res) => {
        try {
            const data = privacyManager.exportUserData();
            res.header('Content-Type', 'application/json');
            res.attachment(`portfolio_export_${Date.now()}.json`);
            res.send(JSON.stringify(data, null, 2));
        } catch (error) {
            res.status(500).json({ error: 'Veri dışa aktarılamadı' });
        }
    });

    app.delete('/api/v1/privacy/delete', (req, res) => {
        try {
            // Basic implementation, maybe add password check for strictness
            privacyManager.deleteUserData();
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Silme işlemi başarısız' });
        }
    });

    // Güncel döviz kurlarını getir
    app.get('/api/v1/prices/rates', async (req, res) => {
        try {
            const rates = await priceService.getExchangeRates();
            res.json(rates);
        } catch (error) {
            console.error('Döviz kurları alınamadı:', error);
            // Fallback değerler
            res.json({
                USD_TRY: '43.04',
                EUR_TRY: '50.46',
                GBP_TRY: '57.92'
            });
        }
    });

    // Fiyatları güncelle (harici API'lerden)
    app.post('/api/v1/prices/refresh', priceRefreshLimiter, async (req, res) => {
        try {
            const assets = db.getAllAssets();
            const results = await priceService.updateAllPrices(assets, (id, data) => {
                return db.updateAsset(id, data);
            });

            // Cache'i invalidate et
            invalidateCache('/api/v1/assets');
            invalidateCache('/api/v1/summary');

            // Başarılı güncelleme olursa socket ile bildir
            if (results.updated > 0) {
                // Tüm bağlı istemcilere yeni fiyatları gönder
                const updatedAssets = db.getAllAssets();
                const summary = db.getPortfolioSummary();

                io.to('default_room').emit('price_update', {
                    type: 'full_update',
                    assets: updatedAssets,
                    summary: summary,
                    timestamp: new Date().toISOString()
                });
                console.log('📡 Socket: Fiyat güncellemesi yayınlandı');
            }

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
    server.listen(PORT, () => {
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

        // Start Automatic Price Updates (Every 60 seconds)
        startPriceUpdateLoop();
    });

    function startPriceUpdateLoop() {
        console.log('⏱️ Otomatik fiyat güncelleme döngüsü başladı (60sn)');
        setInterval(async () => {
            try {
                const assets = db.getAllAssets();
                if (assets.length === 0) return;

                console.log('🔄 Otomatik fiyat güncellemesi tetiklendi...');
                const results = await priceService.updateAllPrices(assets, (id, data) => {
                    return db.updateAsset(id, data);
                });

                if (results.updated > 0) {
                    const updatedAssets = db.getAllAssets();
                    const summary = db.getPortfolioSummary();

                    io.to('default_room').emit('price_update', {
                        type: 'full_update',
                        assets: updatedAssets,
                        summary: summary,
                        timestamp: new Date().toISOString()
                    });
                    console.log('📡 Socket: Otomatik güncelleme yayınlandı');

                    // Cache'i temizle
                    invalidateCache('/api/v1/assets');
                    invalidateCache('/api/v1/summary');
                }
            } catch (error) {
                console.error('❌ Otomatik güncelleme hatası:', error.message);
            }
        }, 60000); // 60 seconds
    }

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
