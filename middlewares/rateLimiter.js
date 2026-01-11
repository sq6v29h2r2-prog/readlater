// middlewares/rateLimiter.js - IP Rate Limiting (Config'den okur)

const config = require('../config');
const logger = require('../utils/logger');

const { windowMs, maxRequests } = config.rateLimit;

const rateLimitStore = new Map();

// Periyodik temizlik
function cleanupRateLimits() {
    const now = Date.now();
    for (const [ip, data] of rateLimitStore.entries()) {
        if (now - data.windowStart > windowMs) {
            rateLimitStore.delete(ip);
        }
    }
}
setInterval(cleanupRateLimits, windowMs);

function rateLimiter(req, res, next) {
    // Development modda rate limit uygulama
    if (config.isDevelopment) {
        return next();
    }

    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    let data = rateLimitStore.get(ip);

    if (!data || now - data.windowStart > windowMs) {
        data = { windowStart: now, count: 0 };
    }

    data.count++;
    rateLimitStore.set(ip, data);

    // Rate limit headers
    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - data.count));
    res.set('X-RateLimit-Reset', Math.ceil((data.windowStart + windowMs) / 1000));

    if (data.count > maxRequests) {
        logger.rateLimit(ip, data.count);
        return res.status(429).json({
            success: false,
            error: 'Çok fazla istek. Lütfen bir dakika sonra tekrar deneyin.',
            retryAfter: Math.ceil((data.windowStart + windowMs - now) / 1000)
        });
    }

    next();
}

module.exports = { rateLimiter };
