// utils/logger.js - Winston ile yapısal loglama

const winston = require('winston');
const path = require('path');
const config = require('../config');

// Log formatı
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}] ${message}`;
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }
        if (stack) {
            log += `\n${stack}`;
        }
        return log;
    })
);

// Console formatı (renkli)
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} ${level}: ${message}`;
        if (Object.keys(meta).length > 0 && !meta.stack) {
            log += ` ${JSON.stringify(meta)}`;
        }
        return log;
    })
);

// Logger oluştur
const logger = winston.createLogger({
    level: config.isDevelopment ? 'debug' : 'info',
    format: logFormat,
    transports: [
        // Console transport
        new winston.transports.Console({
            format: config.isDevelopment ? consoleFormat : logFormat
        })
    ]
});

// Production'da dosyaya da yaz
if (config.isProduction) {
    logger.add(new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error'
    }));
    logger.add(new winston.transports.File({
        filename: path.join('logs', 'combined.log')
    }));
}

// Kısa yollar
logger.fetch = (url) => logger.info(`[FETCH] ${url}`);
logger.parse = (title, length) => logger.info(`[PARSE] ${title}`, { contentLength: length });
logger.save = (title) => logger.info(`[SAVE] ${title}`);
logger.saveDirect = (title) => logger.info(`[SAVE-DIRECT] ${title}`);
logger.auth = (ip, success) => logger.warn(`[AUTH] ${success ? 'Başarılı' : 'Başarısız'}`, { ip });
logger.rateLimit = (ip, count) => logger.warn(`[RATE-LIMIT] IP rate limited`, { ip, requests: count });

module.exports = logger;
