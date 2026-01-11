// routes/healthRoutes.js - Health check ve admin endpoint'leri

const express = require('express');
const router = express.Router();
const cache = require('../utils/cache');
const config = require('../config');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Sunucu sağlık durumu
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Sunucu çalışıyor
 */
const mongoose = require('mongoose');
const connectDB = require('../utils/mongodb');

router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        dbError: connectDB.getLastError(),
        dbState: mongoose.connection.readyState,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: config.env,
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            unit: 'MB'
        }
    });
});

/**
 * @swagger
 * /ready:
 *   get:
 *     summary: Sunucu hazır mı
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Sunucu hazır
 */
router.get('/ready', (req, res) => {
    // Burada veritabanı bağlantısı vb. kontrol edilebilir
    res.json({
        ready: true,
        timestamp: new Date().toISOString()
    });
});

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Cache istatistikleri
 *     tags: [System]
 *     responses:
 *       200:
 *         description: İstatistikler
 */
router.get('/stats', (req, res) => {
    res.json({
        cache: cache.stats(),
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage()
    });
});

module.exports = router;
