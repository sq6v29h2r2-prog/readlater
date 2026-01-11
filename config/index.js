// config/index.js - Merkezi yapılandırma yönetimi

require('dotenv').config();

const config = {
    // Server
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV !== 'production',

    // Security
    apiKey: process.env.READLATER_API_KEY || 'readlater-secret-key-2024',

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },

    // Databaes
    mongodbUri: process.env.MONGODB_URI,

    // Paths
    paths: {
        public: 'public',
        data: 'data'
    }
};

// Geliştirme modunda config'i logla
if (config.isDevelopment) {
    console.log('[CONFIG] Loaded:', {
        port: config.port,
        env: config.env,
        rateLimit: config.rateLimit
    });
}

module.exports = config;
