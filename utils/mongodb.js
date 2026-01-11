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
            family: 4 // IPv4 zorla (Render + Atlas DNS sorunları için)
        });
        logger.info('MongoDB bağlantısı başarılı');
    } catch (error) {
        logger.error('!!! MongoDB bağlantı hatası:', error.message);
    }
};

module.exports = connectDB;
