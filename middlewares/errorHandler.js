// middlewares/errorHandler.js - Merkezi hata yönetimi

const config = require('../config');
const logger = require('../utils/logger');

// Async handler wrapper - try/catch tekrarını önler
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Merkezi error handler
function errorHandler(err, req, res, next) {
    logger.error(err.message, { stack: err.stack, path: req.path });

    // Bilinen hata türleri
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    if (err.name === 'NotFoundError') {
        return res.status(404).json({
            success: false,
            error: err.message
        });
    }

    // Joi validation hataları
    if (err.isJoi) {
        return res.status(400).json({
            success: false,
            error: err.details.map(d => d.message).join(', ')
        });
    }

    // Genel hata
    res.status(500).json({
        success: false,
        error: config.isProduction ? 'Bir hata oluştu' : err.message
    });
}

// Özel hata sınıfları
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}

module.exports = {
    asyncHandler,
    errorHandler,
    ValidationError,
    NotFoundError
};
