// middlewares/cors.js - CORS middleware with whitelist support

const config = require('../config');

// İzin verilen origin'ler
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://readinglater.com',
    'https://readinglater.com',
    // Extension'lar için
    'moz-extension://*',
    'chrome-extension://*'
];

// Development modunda tüm origin'lere izin ver
const isOriginAllowed = (origin) => {
    if (config.isDevelopment) return true;
    if (!origin) return true; // Same-origin istekler

    return allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
            const pattern = new RegExp('^' + allowed.replace('*', '.*') + '$');
            return pattern.test(origin);
        }
        return allowed === origin;
    });
};

function cors(req, res, next) {
    const origin = req.headers.origin;

    if (isOriginAllowed(origin)) {
        res.header('Access-Control-Allow-Origin', origin || '*');
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 saat cache

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
}

// Origin'i whitelist'e ekle
function addOrigin(origin) {
    if (!allowedOrigins.includes(origin)) {
        allowedOrigins.push(origin);
    }
}

module.exports = cors;
module.exports.addOrigin = addOrigin;
module.exports.allowedOrigins = allowedOrigins;
