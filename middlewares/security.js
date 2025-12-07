// middlewares/security.js - Güvenlik middleware'leri

const helmet = require('helmet');

/**
 * Helmet - Güvenlik başlıkları
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - X-XSS-Protection: 0 (modern tarayıcılar için)
 * - Strict-Transport-Security
 * - Content-Security-Policy
 */
const helmetMiddleware = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger için
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:*"]
        }
    },
    crossOriginEmbedderPolicy: false, // Swagger UI için
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

/**
 * XSS Sanitization - Request body temizleme
 */
function xssSanitizer(req, res, next) {
    if (req.body) {
        sanitizeObject(req.body);
    }
    if (req.query) {
        sanitizeObject(req.query);
    }
    if (req.params) {
        sanitizeObject(req.params);
    }
    next();
}

function sanitizeObject(obj) {
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            // Tehlikeli karakterleri escape et
            obj[key] = obj[key]
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    }
}

/**
 * HTML içerikler için sanitizer atla
 * (content alanı için XSS temizleme yapma)
 */
function selectiveSanitizer(req, res, next) {
    // HTML içerik alanlarını koru
    const htmlFields = ['html', 'content'];
    const preserved = {};

    htmlFields.forEach(field => {
        if (req.body && req.body[field]) {
            preserved[field] = req.body[field];
        }
    });

    // Sanitize et
    xssSanitizer(req, res, () => {
        // HTML alanları geri yükle
        htmlFields.forEach(field => {
            if (preserved[field]) {
                req.body[field] = preserved[field];
            }
        });
        next();
    });
}

/**
 * HTTP Parameter Pollution koruması
 */
function hppProtection(req, res, next) {
    // Aynı parametrenin birden fazla gönderilmesini engelle
    if (req.query) {
        for (const key in req.query) {
            if (Array.isArray(req.query[key])) {
                req.query[key] = req.query[key][0];
            }
        }
    }
    next();
}

/**
 * Request boyut limiti kontrolü
 */
function requestSizeLimit(maxSize = '50mb') {
    return (req, res, next) => {
        const contentLength = req.headers['content-length'];
        if (contentLength && parseInt(contentLength) > parseSize(maxSize)) {
            return res.status(413).json({
                success: false,
                error: 'İstek boyutu çok büyük'
            });
        }
        next();
    };
}

function parseSize(size) {
    const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
    const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
    if (!match) return 50 * 1024 * 1024; // Default 50MB
    return parseInt(match[1]) * (units[match[2]] || 1);
}

module.exports = {
    helmetMiddleware,
    xssSanitizer,
    selectiveSanitizer,
    hppProtection,
    requestSizeLimit
};
