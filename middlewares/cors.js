// middlewares/cors.js - CORS middleware with whitelist support

const config = require('../config');

// İzin verilen origin'ler
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost',
    'http://127.0.0.1:3000',
    'http://127.0.0.1',
    'http://readlater.com',
    'http://readlater',
    'http://reader.local',
    'http://100.90.99.112',
    'http://192.168.1.15',
    'http://readinglater.com',
    'http://readinglater.com:3000',
    'https://readinglater.com',
    // Extension'lar için
    'moz-extension://*',
    'chrome-extension://*'
];

// Development modunda tüm origin'lere izin ver
const isOriginAllowed = (origin) => {
    if (config.isDevelopment) return true;
    if (!origin) return true; // Same-origin veya server-side istekler

    return allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
            const pattern = new RegExp('^' + allowed.replace(/\*/g, '.*') + '$');
            return pattern.test(origin);
        }
        return allowed === origin;
    });
};

function cors(req, res, next) {
    const origin = req.headers.origin;

    if (isOriginAllowed(origin)) {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');
    res.header('Access-Control-Max-Age', '86400'); // 24 saat cache

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
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
