/**
 * Logger Utility
 * Structured logging with different levels
 * Production-ready console replacement
 */

const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const LOG_COLORS = {
    error: '\x1b[31m', // Red
    warn: '\x1b[33m',  // Yellow
    info: '\x1b[36m',  // Cyan
    debug: '\x1b[90m', // Gray
    reset: '\x1b[0m'
};

const LOG_EMOJIS = {
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️',
    debug: '🔍'
};

class Logger {
    constructor(options = {}) {
        this.level = options.level || process.env.LOG_LEVEL || 'info';
        this.enableColors = options.enableColors !== false;
        this.enableEmojis = options.enableEmojis !== false;
        this.enableTimestamp = options.enableTimestamp !== false;
        this.enableJson = options.enableJson || process.env.NODE_ENV === 'production';
    }

    shouldLog(level) {
        return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();

        if (this.enableJson) {
            // JSON format for production (easy to parse)
            return JSON.stringify({
                timestamp,
                level,
                message,
                ...meta
            });
        }

        // Human-readable format for development
        const parts = [];

        if (this.enableTimestamp) {
            parts.push(`[${timestamp}]`);
        }

        if (this.enableEmojis) {
            parts.push(LOG_EMOJIS[level]);
        }

        if (this.enableColors) {
            parts.push(LOG_COLORS[level]);
        }

        parts.push(`[${level.toUpperCase()}]`);
        parts.push(message);

        if (this.enableColors) {
            parts.push(LOG_COLORS.reset);
        }

        // Add metadata
        if (Object.keys(meta).length > 0) {
            parts.push(JSON.stringify(meta));
        }

        return parts.join(' ');
    }

    log(level, message, meta = {}) {
        if (!this.shouldLog(level)) {
            return;
        }

        const formatted = this.formatMessage(level, message, meta);

        if (level === 'error') {
            console.error(formatted);
        } else if (level === 'warn') {
            console.warn(formatted);
        } else {
            console.log(formatted);
        }
    }

    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    // HTTP request logger middleware
    requestLogger() {
        return (req, res, next) => {
            const start = Date.now();

            // Log response when finished
            res.on('finish', () => {
                const duration = Date.now() - start;
                const level = res.statusCode >= 400 ? 'warn' : 'info';

                this.log(level, `${req.method} ${req.path}`, {
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    ip: req.ip,
                    userAgent: req.get('user-agent')
                });
            });

            next();
        };
    }
}

// Create default logger instance
const logger = new Logger();

module.exports = logger;
module.exports.Logger = Logger;
