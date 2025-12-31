/**
 * Input Sanitization Middleware
 * XSS ve injection saldırılarına karşı koruma
 */

// Tehlikeli karakterleri temizle
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    
    return str
        .trim()
        .replace(/[<>]/g, '') // HTML tags
        .replace(/javascript:/gi, '') // JavaScript protocol
        .replace(/on\w+\s*=/gi, '') // Event handlers
        .substring(0, 1000); // Max length
}

// Sayısal değerleri doğrula
function sanitizeNumber(num, min = -Infinity, max = Infinity) {
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return null;
    if (parsed < min || parsed > max) return null;
    return parsed;
}

// Object içindeki tüm string değerleri temizle
function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'number') {
            sanitized[key] = value;
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

// Request body sanitization middleware
function sanitizeBody(req, res, next) {
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    next();
}

// Query params sanitization middleware
function sanitizeQuery(req, res, next) {
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }
    next();
}

// Params sanitization middleware
function sanitizeParams(req, res, next) {
    if (req.params) {
        req.params = sanitizeObject(req.params);
    }
    next();
}

// Combined sanitization middleware
function sanitizeAll(req, res, next) {
    sanitizeBody(req, res, () => {
        sanitizeQuery(req, res, () => {
            sanitizeParams(req, res, next);
        });
    });
}

module.exports = {
    sanitizeString,
    sanitizeNumber,
    sanitizeObject,
    sanitizeBody,
    sanitizeQuery,
    sanitizeParams,
    sanitizeAll
};
