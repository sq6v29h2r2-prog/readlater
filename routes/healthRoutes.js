// routes/healthRoutes.js - Health check ve admin endpoint'leri

const express = require('express');
const router = express.Router();
const cache = require('../utils/cache');
const config = require('../config');
const { checkConnection } = require('../utils/mongodb');

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
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
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
router.get('/ready', async (req, res) => {
    const dbStatus = await checkConnection();

    res.json({
        ready: true,
        timestamp: new Date().toISOString(),
        database: dbStatus
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
