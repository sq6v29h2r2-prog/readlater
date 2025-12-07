// middlewares/auth.js - API Key Authentication (Config'den okur)

const config = require('../config');
const logger = require('../utils/logger');

function apiKeyAuth(req, res, next) {
    // Statik dosyalar ve ana sayfa için atla
    if (req.path === '/' || req.path.startsWith('/read/') || req.path === '/archive' || !req.path.startsWith('/api/')) {
        return next();
    }

    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    // Extension ve tarayıcı istekleri için API key kontrolünü atla (localhost)
    const isLocalRequest = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';

    if (isLocalRequest) {
        return next();
    }

    // Dış istekler için API key gerekli
    if (!apiKey || apiKey !== config.apiKey) {
        logger.auth(req.ip, false);
        return res.status(401).json({
            success: false,
            error: 'Geçersiz veya eksik API anahtarı'
        });
    }

    logger.auth(req.ip, true);
    next();
}

module.exports = { apiKeyAuth };
