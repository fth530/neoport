function setCacheHeaders(req, res, next) {
    // Static assets - long cache (1 year)
    if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    // API responses - short cache (5 mins) for read ops
    else if (req.url.startsWith('/api/') && req.method === 'GET') {
        res.setHeader('Cache-Control', 'public, max-age=300');
    }

    // HTML - no cache to ensure fresh app load
    else {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }

    next();
}

module.exports = setCacheHeaders;
