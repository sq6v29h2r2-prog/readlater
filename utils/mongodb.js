const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('../config');

let lastError = null;

const connectDB = async () => {
    if (!config.mongodbUri) {
        logger.warn('MONGODB_URI tanımlanmamış. Yerel JSON modunda çalışılıyor.');
        return;
    }

    try {
        await mongoose.connect(config.mongodbUri, {
            family: 4 // IPv4 zorla (Render + Atlas DNS sorunları için)
        });
        logger.info('MongoDB bağlantısı başarılı');
        lastError = null;
    } catch (error) {
        lastError = error.message;
        logger.error('!!! MongoDB bağlantı hatası:', error.message);
        console.error('VERİTABANI BAĞLANTISI KURULAMADI - Uygulama sınırlı modda çalışmaya devam edecek');
    }
};

module.exports = connectDB;
module.exports.getLastError = () => lastError;
