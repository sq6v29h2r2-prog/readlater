const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('../config');

const connectDB = async () => {
    if (!config.mongodbUri) {
        logger.warn('MONGODB_URI tanımlanmamış. Yerel JSON modunda çalışılıyor.');
        return;
    }

    try {
        await mongoose.connect(config.mongodbUri);
        logger.info('MongoDB bağlantısı başarılı');
    } catch (error) {
        logger.error('!!! MongoDB bağlantı hatası:', error.message);
        // process.exit(1) yerine hata durumunda sunucunun ayakta kalmasını sağlayalım (debug için)
        console.error('VERİTABANI BAĞLANTISI KURULAMADI - Uygulama sınırlı modda çalışmaya devam edecek');
    }
};

module.exports = connectDB;
