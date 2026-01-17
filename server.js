// server.js - Ana sunucu dosyası (Production Ready + Security)

const express = require('express');
const path = require('path');
const http = require('http');    // ← EKLENDİ
const https = require('https');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');

// Config (en başta yüklenmeli - .env okur)
const config = require('./config');
const swaggerSpec = require('./config/swagger');
const logger = require('./utils/logger');

// Security Middlewares
const { helmetMiddleware, selectiveSanitizer, hppProtection } = require('./middlewares/security');
const cors = require('./middlewares/cors');
const { rateLimiter } = require('./middlewares/rateLimiter');
const { apiKeyAuth } = require('./middlewares/auth');
const { errorHandler } = require('./middlewares/errorHandler');

// Routes
const { articleRoutes, pageRoutes, healthRoutes } = require('./routes');

// Database
const { connectDB } = require('./utils/mongodb');
connectDB();

const app = express();
let server;

// === VERBOSE REQUEST LOGGER (Hata tespiti için) ===
app.use((req, res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    res.on('finish', () => {
        console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode} - IP: ${req.ip} - Origin: ${req.headers.origin || 'none'}`);
    });
    next();
});

// === SECURITY MIDDLEWARE STACK ===

// Helmet - Security headers
app.use(helmetMiddleware);

// HPP - HTTP Parameter Pollution koruması
app.use(hppProtection);

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files - Cache for 1 day in production
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: config.env === 'production' ? '1d' : 0,
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Cache CSS/JS/fonts aggressively
        if (filePath.match(/\.(css|js|woff2?|ttf|otf)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        }
        // Cache images moderately
        else if (filePath.match(/\.(jpg|jpeg|png|gif|svg|ico)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
        }
        // HTML files - minimal caching
        else if (filePath.match(/\.html$/)) {
            res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
        }
    }
}));

// CORS with whitelist
app.use(cors);

// Rate limiting
app.use(rateLimiter);

// API key auth
app.use(apiKeyAuth);


// === SWAGGER DOCS ===
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ReadLater API Docs'
}));

// === ROUTES ===

// Health & System routes
app.use(healthRoutes);

// API v1 routes
app.use('/api/v1', articleRoutes);
app.use('/api', articleRoutes); // Geriye uyumluluk

// Page routes
app.use(pageRoutes);

// === ERROR HANDLING ===

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint bulunamadı'
    });
});

// Merkezi error handler
app.use(errorHandler);

// === GRACEFUL SHUTDOWN ===

function gracefulShutdown(signal) {
    logger.info(`${signal} sinyali alındı. Sunucu kapatılıyor...`);

    if (server) {
        server.close(() => {
            logger.info('Aktif bağlantılar kapatıldı');
            process.exit(0);
        });

        setTimeout(() => {
            logger.error('Zorla kapatılıyor...');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    logger.error('Beklenmeyen hata:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('İşlenmeyen Promise rejection:', reason);
});

// === SERVER START ===

const startServer = () => {
    const isHttps = process.env.HTTPS_ENABLED === 'true';

    if (isHttps && process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
        // HTTPS Server
        const sslOptions = {
            key: fs.readFileSync(process.env.SSL_KEY_PATH),
            cert: fs.readFileSync(process.env.SSL_CERT_PATH)
        };
        server = https.createServer(sslOptions, app);
        logger.info('HTTPS modu aktif');
    } else {
        // HTTP Server
        server = http.createServer(app);  // ← DÜZELTİLDİ (eskisi: server = app)
    }

    server.listen(config.port, () => {
        logger.info('Sunucu başlatıldı', {
            port: config.port,
            env: config.env,
            https: isHttps
        });

        console.log(`
╔════════════════════════════════════════════════════════════════╗
║                      ReadLater Sunucusu                        ║
╠════════════════════════════════════════════════════════════════╣
║  Yerel:     http${isHttps ? 's' : ''}://localhost:${config.port}                            ║
║  API Docs:  http${isHttps ? 's' : ''}://localhost:${config.port}/api-docs                   ║
║  Ortam:     ${config.env.padEnd(48)}║
╠════════════════════════════════════════════════════════════════╣
║  Güvenlik:  Helmet ✓ | XSS ✓ | HPP ✓ | CORS Whitelist ✓       ║
║  API:       /api/v1/* (versiyonlu) | /api/* (uyumluluk)        ║
║  Sistem:    /health | /ready | /stats                          ║
╚════════════════════════════════════════════════════════════════╝
`);
    });
};

startServer();

module.exports = app;