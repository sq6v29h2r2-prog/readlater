// utils/cache.js - In-memory cache with node-cache

const NodeCache = require('node-cache');

// TTL: 60 saniye, checkperiod: 120 saniye
const cache = new NodeCache({
    stdTTL: 60,
    checkperiod: 120,
    useClones: false // Performans için
});

/**
 * Cache'e değer kaydet
 * @param {string} key - Anahtar
 * @param {any} value - Değer
 * @param {number} ttl - TTL (saniye), varsayılan 60
 */
function set(key, value, ttl = 60) {
    return cache.set(key, value, ttl);
}

/**
 * Cache'den değer al
 * @param {string} key - Anahtar
 * @returns {any} Değer veya undefined
 */
function get(key) {
    return cache.get(key);
}

/**
 * Cache'den değer sil
 * @param {string} key - Anahtar
 */
function del(key) {
    return cache.del(key);
}

/**
 * Tüm cache'i temizle
 */
function flush() {
    return cache.flushAll();
}

/**
 * Cache istatistiklerini al
 */
function stats() {
    return cache.getStats();
}

/**
 * Get or Set pattern - Yoksa hesapla ve kaydet
 * @param {string} key - Anahtar
 * @param {Function} fetchFn - Değer yoksa çağrılacak fonksiyon
 * @param {number} ttl - TTL (saniye)
 */
async function getOrSet(key, fetchFn, ttl = 60) {
    let value = cache.get(key);

    if (value === undefined) {
        value = await fetchFn();
        cache.set(key, value, ttl);
    }

    return value;
}

module.exports = {
    set,
    get,
    del,
    flush,
    stats,
    getOrSet,
    cache // Ham cache objesi
};
