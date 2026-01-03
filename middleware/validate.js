/**
 * Validation Middleware
 * Request validasyonu için yardımcı fonksiyonlar
 */

const { body, param, validationResult } = require('express-validator');

// Validation sonuçlarını kontrol et
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value
        }));

        return res.status(400).json({
            error: 'Validasyon hatası',
            details: errorMessages
        });
    }
    next();
};

// Varlık ekleme validasyonu
const validateCreateAsset = [
    body('name')
        .trim()
        .notEmpty().withMessage('Varlık adı zorunludur')
        .isLength({ min: 1, max: 100 }).withMessage('Varlık adı 1-100 karakter olmalıdır')
        .matches(/^[a-zA-Z0-9\s\-_ğüşıöçĞÜŞİÖÇ]+$/).withMessage('Varlık adı geçersiz karakterler içeriyor'),

    body('symbol')
        .trim()
        .notEmpty().withMessage('Sembol zorunludur')
        .isLength({ min: 1, max: 20 }).withMessage('Sembol 1-20 karakter olmalıdır')
        .matches(/^[A-Z0-9]+$/).withMessage('Sembol sadece büyük harf ve rakam içermelidir'),

    body('type')
        .notEmpty().withMessage('Tür zorunludur')
        .isIn(['crypto', 'stock', 'gold', 'currency']).withMessage('Geçersiz varlık türü'),

    body('quantity')
        .optional()
        .toFloat()
        .isFloat({ min: 0 }).withMessage('Miktar negatif olamaz')
        .custom((value) => {
            if (value > 1000000000) {
                throw new Error('Miktar çok büyük');
            }
            return true;
        }),

    body('avg_cost')
        .optional()
        .toFloat()
        .isFloat({ min: 0 }).withMessage('Fiyat negatif olamaz')
        .custom((value) => {
            if (value > 1000000000) {
                throw new Error('Fiyat çok büyük');
            }
            return true;
        }),

    body('currency')
        .optional()
        .isIn(['TRY', 'USD', 'EUR']).withMessage('Geçersiz para birimi'),

    handleValidationErrors
];

// Varlık güncelleme validasyonu
const validateUpdateAsset = [
    param('id')
        .isInt({ min: 1 }).withMessage('Geçersiz varlık ID'),

    body('quantity')
        .optional()
        .toFloat()
        .isFloat({ min: 0 }).withMessage('Miktar negatif olamaz'),

    body('avg_cost')
        .optional()
        .toFloat()
        .isFloat({ min: 0 }).withMessage('Ortalama maliyet negatif olamaz'),

    body('current_price')
        .optional()
        .toFloat()
        .isFloat({ min: 0 }).withMessage('Güncel fiyat negatif olamaz'),

    handleValidationErrors
];

// Alım/Satım validasyonu
const validateTransaction = [
    param('id')
        .isInt({ min: 1 }).withMessage('Geçersiz varlık ID'),

    body('quantity')
        .notEmpty().withMessage('Miktar zorunludur')
        .toFloat()
        .isFloat({ min: 0.00000001, max: 1000000000 }).withMessage('Miktar 0 ile 1 milyar arasında olmalıdır'),

    body('price')
        .notEmpty().withMessage('Fiyat zorunludur')
        .toFloat()
        .isFloat({ min: 0, max: 1000000000 }).withMessage('Fiyat 0 ile 1 milyar arasında olmalıdır'),

    handleValidationErrors
];

// ID parametresi validasyonu
const validateId = [
    param('id')
        .isInt({ min: 1 }).withMessage('Geçersiz ID'),

    handleValidationErrors
];

module.exports = {
    validateCreateAsset,
    validateUpdateAsset,
    validateTransaction,
    validateId,
    handleValidationErrors
};
