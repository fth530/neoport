/**
 * Simple In-Memory Cache Middleware
 * API response'larını cache'ler
 */

class SimpleCache {
    constructor(ttl = 60000) { // Default 60 saniye
        this.cache = new Map();
        this.ttl = ttl;
    }
    
    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }
        
        // TTL kontrolü
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }
    
    set(key, data, customTtl) {
        const ttl = customTtl || this.ttl;
        this.cache.set(key, {
            data,
            expiry: Date.now() + ttl
        });
    }
    
    delete(key) {
        this.cache.delete(key);
    }
    
    clear() {
        this.cache.clear();
    }
    
    size() {
        return this.cache.size;
    }
    
    // Expired item'ları temizle
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    }
    
    getStats() {
        return {
            size: this.cache.size,
            ttl: this.ttl,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Global cache instance
const cache = new SimpleCache(60000); // 60 saniye

// Cleanup her 5 dakikada bir
setInterval(() => {
    cache.cleanup();
    console.log(`🧹 Cache temizlendi. Mevcut boyut: ${cache.size()}`);
}, 5 * 60 * 1000);

// Cache middleware factory
function cacheMiddleware(ttl) {
    return (req, res, next) => {
        // Sadece GET isteklerini cache'le
        if (req.method !== 'GET') {
            return next();
        }
        
        const key = `${req.method}:${req.originalUrl || req.url}`;
        const cachedResponse = cache.get(key);
        
        if (cachedResponse) {
            console.log(`✅ Cache hit: ${key}`);
            res.setHeader('X-Cache', 'HIT');
            return res.json(cachedResponse);
        }
        
        // Response'u intercept et
        const originalJson = res.json.bind(res);
        res.json = function(data) {
            cache.set(key, data, ttl);
            res.setHeader('X-Cache', 'MISS');
            return originalJson(data);
        };
        
        next();
    };
}

// Cache invalidation helper
function invalidateCache(pattern) {
    let count = 0;
    for (const key of cache.cache.keys()) {
        if (key.includes(pattern)) {
            cache.delete(key);
            count++;
        }
    }
    console.log(`🗑️ ${count} cache entry silindi (pattern: ${pattern})`);
    return count;
}

module.exports = {
    cache,
    cacheMiddleware,
    invalidateCache
};
