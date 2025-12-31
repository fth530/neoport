/**
 * Error Handler Middleware
 * Async fonksiyonlardaki hataları yakalar ve tutarlı response döner
 */

// Async handler wrapper - try-catch tekrarını önler
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Global error handler
function errorHandler(err, req, res, next) {
    const NODE_ENV = process.env.NODE_ENV || 'development';
    
    // Log error
    console.error('❌ Error:', {
        message: err.message,
        stack: NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Build error response
    const errorResponse = {
        error: err.message || 'Sunucu hatası',
        timestamp: new Date().toISOString(),
        path: req.path
    };

    // Add details in development
    if (NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
        errorResponse.details = err.details;
    }

    // Send response
    res.status(statusCode).json(errorResponse);
}

// Not found handler
function notFoundHandler(req, res, next) {
    const error = new Error(`Endpoint bulunamadı: ${req.method} ${req.path}`);
    error.statusCode = 404;
    next(error);
}

// Custom error class
class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    asyncHandler,
    errorHandler,
    notFoundHandler,
    AppError
};
