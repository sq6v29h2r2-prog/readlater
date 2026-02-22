const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('../config');

const connectDB = async () => {
    if (!config.mongodbUri) {
        logger.warn('MONGODB_URI tanımlanmamış. Yerel JSON modunda çalışılıyor.');
        return;
    }

    try {
        await mongoose.connect(config.mongodbUri, {
            family: 4, // IPv4 zorla (Render + Atlas DNS sorunları için)
            serverSelectionTimeoutMS: 30000, // 30 saniye timeout (SRV DNS çözümleme yavaşlığı için)
            socketTimeoutMS: 45000, // 45 saniye socket timeout
            maxPoolSize: 10, // Max connection pool size
            minPoolSize: 2, // Min connection pool size
            retryWrites: true, // Yazma işlemlerini otomatik yeniden dene
            retryReads: true // Okuma işlemlerini otomatik yeniden dene
        });
        logger.info('MongoDB bağlantısı başarılı');
        setupConnectionEventListeners();
    } catch (error) {
        logger.error('!!! MongoDB bağlantı hatası:', error.message);
        logger.info('Uygulama yerel modda çalışmaya devam edecek');
    }
};

// Connection event listeners
const setupConnectionEventListeners = () => {
    const connection = mongoose.connection;

    // Bağlantı kesildiğinde
    connection.on('disconnected', () => {
        logger.warn('MongoDB bağlantısı kesildi');
    });

    // Yeniden bağlanıldığında
    connection.on('reconnected', () => {
        logger.info('MongoDB yeniden bağlandı');
    });

    // Bağlantı hatası
    connection.on('error', (err) => {
        logger.error('MongoDB bağlantı hatası:', err.message);
    });

    // Mongoose otomatik olarak yeniden bağlanmayı dener
    connection.on('connecting', () => {
        logger.info('MongoDB\'ye bağlanılıyor...');
    });
};

// MongoDB bağlantı durumunu kontrol et
const isConnected = () => {
    return mongoose.connection.readyState === 1;
};

// Health check için basit DB query
const checkConnection = async () => {
    if (!config.mongodbUri) {
        return { connected: false, mode: 'local' };
    }

    try {
        if (!isConnected()) {
            return { connected: false, mode: 'mongodb', error: 'Not connected' };
        }

        // Basit ping sorgusu
        await mongoose.connection.db.admin().ping();
        return { connected: true, mode: 'mongodb', state: mongoose.connection.readyState };
    } catch (error) {
        return { connected: false, mode: 'mongodb', error: error.message };
    }
};

module.exports = { connectDB, isConnected, checkConnection };
