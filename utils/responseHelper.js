// utils/responseHelper.js - Standart response yardımcıları

/**
 * Başarılı response gönder
 * @param {Response} res - Express response objesi
 * @param {object} data - Gönderilecek veri
 * @param {string} message - Başarı mesajı
 * @param {number} status - HTTP status kodu
 */
exports.success = (res, data = {}, message = 'İşlem başarılı', status = 200) => {
    return res.status(status).json({
        success: true,
        message,
        ...data
    });
};

/**
 * Hata response'u gönder
 * @param {Response} res - Express response objesi
 * @param {number} status - HTTP status kodu
 * @param {string} message - Hata mesajı
 * @param {object} extra - Ek veri
 */
exports.error = (res, status = 500, message = 'Bir hata oluştu', extra = {}) => {
    return res.status(status).json({
        success: false,
        error: message,
        ...extra
    });
};

/**
 * Zaten var response'u gönder
 * @param {Response} res - Express response objesi
 * @param {string} message - Mesaj
 * @param {object} data - Ek veri
 */
exports.exists = (res, message = 'Kayıt zaten mevcut', data = {}) => {
    return res.json({
        success: false,
        exists: true,
        error: message,
        ...data
    });
};

/**
 * Doğrulama hatası response'u gönder
 * @param {Response} res - Express response objesi
 * @param {string} message - Doğrulama hatası mesajı
 */
exports.validationError = (res, message) => {
    return exports.error(res, 400, message);
};

/**
 * Bulunamadı response'u gönder
 * @param {Response} res - Express response objesi
 * @param {string} message - Mesaj
 */
exports.notFound = (res, message = 'Kayıt bulunamadı') => {
    return exports.error(res, 404, message);
};
