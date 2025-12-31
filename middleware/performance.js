/**
 * Performance Monitoring Middleware
 * API endpoint'lerinin performansını ölçer
 */

// Response time tracking
function responseTime(req, res, next) {
    const start = Date.now();
    
    // Response bittiğinde çalışacak
    const cleanup = () => {
        const duration = Date.now() - start;
        const method = req.method;
        const url = req.originalUrl || req.url;
        const status = res.statusCode;
        
        // Yavaş istekleri logla (>1000ms)
        if (duration > 1000) {
            console.warn(`⚠️ Yavaş istek: ${method} ${url} - ${duration}ms (${status})`);
        } else if (duration > 500) {
            console.log(`⏱️ ${method} ${url} - ${duration}ms (${status})`);
        }
    };
    
    res.on('finish', cleanup);
    res.on('close', cleanup);
    
    next();
}

// Memory usage monitoring
function memoryMonitor() {
    const used = process.memoryUsage();
    const mb = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100;
    
    return {
        rss: mb(used.rss), // Resident Set Size
        heapTotal: mb(used.heapTotal),
        heapUsed: mb(used.heapUsed),
        external: mb(used.external)
    };
}

// Performance metrics collector
class PerformanceMetrics {
    constructor() {
        this.requests = {
            total: 0,
            success: 0,
            error: 0,
            byEndpoint: {}
        };
        this.responseTimes = [];
        this.startTime = Date.now();
    }
    
    recordRequest(endpoint, duration, statusCode) {
        this.requests.total++;
        
        if (statusCode >= 200 && statusCode < 400) {
            this.requests.success++;
        } else {
            this.requests.error++;
        }
        
        if (!this.requests.byEndpoint[endpoint]) {
            this.requests.byEndpoint[endpoint] = {
                count: 0,
                totalTime: 0,
                avgTime: 0,
                minTime: Infinity,
                maxTime: 0
            };
        }
        
        const endpointStats = this.requests.byEndpoint[endpoint];
        endpointStats.count++;
        endpointStats.totalTime += duration;
        endpointStats.avgTime = endpointStats.totalTime / endpointStats.count;
        endpointStats.minTime = Math.min(endpointStats.minTime, duration);
        endpointStats.maxTime = Math.max(endpointStats.maxTime, duration);
        
        // Son 100 response time'ı sakla
        this.responseTimes.push(duration);
        if (this.responseTimes.length > 100) {
            this.responseTimes.shift();
        }
    }
    
    getStats() {
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        const avgResponseTime = this.responseTimes.length > 0
            ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
            : 0;
        
        return {
            uptime: `${Math.floor(uptime / 60)}m ${uptime % 60}s`,
            requests: this.requests,
            avgResponseTime: `${avgResponseTime}ms`,
            memory: memoryMonitor(),
            timestamp: new Date().toISOString()
        };
    }
    
    reset() {
        this.requests = {
            total: 0,
            success: 0,
            error: 0,
            byEndpoint: {}
        };
        this.responseTimes = [];
    }
}

const metrics = new PerformanceMetrics();

// Metrics tracking middleware
function trackMetrics(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const endpoint = `${req.method} ${req.route?.path || req.path}`;
        metrics.recordRequest(endpoint, duration, res.statusCode);
    });
    
    next();
}

module.exports = {
    responseTime,
    memoryMonitor,
    trackMetrics,
    metrics
};
