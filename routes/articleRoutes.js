// routes/articleRoutes.js - Makale API endpoint'leri (Validation + Response Helpers)

const express = require('express');
const router = express.Router();
const { articleRepository } = require('../repositories');
const { asyncHandler, NotFoundError, validate, schemas } = require('../middlewares');
const { saveArticleFromUrl, saveArticleFromHtml, saveErrorArticle } = require('../services/articleService');
const { success, exists, notFound } = require('../utils/responseHelper');
const logger = require('../utils/logger');

// URL kaydet
router.post('/save', validate(schemas.saveUrl), asyncHandler(async (req, res) => {
    const { url } = req.body;

    logger.info(`[SAVE] Yeni istek: ${url}`);

    try {
        const result = await saveArticleFromUrl(url);

        if (result.exists) {
            logger.info(`[SAVE] Zaten kayıtlı: ${result.article.title}`);
            return exists(res, 'Bu makale zaten kayıtlı', {
                article: { id: result.article.id, title: result.article.title }
            });
        }

        return success(res, { article: result.article }, 'Makale kaydedildi');

    } catch (error) {
        logger.error(`[SAVE] Hata: ${error.message}`);
        saveErrorArticle(url, error.message);
        throw error;
    }
}));

// HTML ile kaydet (extension'dan)
router.post('/save-with-content', validate(schemas.saveWithContent), asyncHandler(async (req, res) => {
    const { url, html } = req.body;

    logger.info(`[SAVE-DIRECT] Tarayıcıdan: ${url} (${html.length} karakter)`);

    const result = await saveArticleFromHtml(url, html);

    if (result.exists) {
        logger.info(`[SAVE-DIRECT] Zaten kayıtlı: ${result.article.title}`);
        return exists(res, 'Bu makale zaten kayıtlı', {
            article: { id: result.article.id, title: result.article.title }
        });
    }

    return success(res, { article: result.article }, 'Makale kaydedildi (tarayıcıdan)');
}));

// Tüm makaleleri listele (pagination destekli)
router.get('/articles', asyncHandler(async (req, res) => {
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    const articles = await articleRepository.findAll(page, limit);

    // Eğer pagination varsa toplam sayıyı da döndür
    if (page !== null && typeof articleRepository.count === 'function') {
        const total = await articleRepository.count();
        return success(res, {
            articles,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    }

    return success(res, { articles });
}));

// Arşivlenmiş makaleleri listele (pagination destekli)
router.get('/archived', asyncHandler(async (req, res) => {
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    const articles = await articleRepository.findArchived(page, limit);

    // Eğer pagination varsa toplam sayıyı da döndür
    if (page !== null && typeof articleRepository.countArchived === 'function') {
        const total = await articleRepository.countArchived();
        return success(res, {
            articles,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    }

    return success(res, { articles });
}));

// Tek makale getir
router.get('/article/:id', asyncHandler(async (req, res) => {
    const article = await articleRepository.findById(req.params.id);
    if (!article) {
        throw new NotFoundError('Makale bulunamadı');
    }
    await articleRepository.markAsRead(req.params.id);
    return success(res, { article });
}));

// Makale sil
router.get('/article/:id/delete', asyncHandler(async (req, res) => {
    // legacy support for GET delete
    const result = await articleRepository.delete(req.params.id);
    return res.redirect('/');
}));

router.delete('/article/:id', asyncHandler(async (req, res) => {
    const result = await articleRepository.delete(req.params.id);
    if (!result.success) {
        throw new NotFoundError('Makale bulunamadı');
    }
    return success(res, {}, 'Makale silindi');
}));

// Arşive taşı
router.post('/article/:id/archive', asyncHandler(async (req, res) => {
    const result = await articleRepository.archive(req.params.id);
    if (!result.success) {
        throw new NotFoundError('Makale bulunamadı');
    }
    return success(res, {}, 'Makale arşive taşındı');
}));

// Arşivden çıkar
router.post('/article/:id/unarchive', asyncHandler(async (req, res) => {
    const result = await articleRepository.unarchive(req.params.id);
    if (!result.success) {
        throw new NotFoundError('Makale bulunamadı');
    }
    return success(res, {}, 'Makale arşivden çıkarıldı');
}));

// Okunmadı işaretle
router.post('/article/:id/unread', asyncHandler(async (req, res) => {
    const result = await articleRepository.unmarkAsRead(req.params.id);
    if (!result.success) {
        throw new NotFoundError('Makale bulunamadı');
    }
    return success(res, {}, 'Makale okunmadı olarak işaretlendi');
}));

// Highlight ekle
router.post('/article/:id/highlight', validate(schemas.highlight), asyncHandler(async (req, res) => {
    const { text, color } = req.body;
    const result = await articleRepository.addHighlight(req.params.id, text, color || 'yellow');
    if (!result.success) {
        throw new NotFoundError('Makale bulunamadı');
    }
    return success(res, { highlight: result.highlight }, 'Highlight eklendi');
}));

// Highlight sil
router.delete('/article/:id/highlight/:highlightId', asyncHandler(async (req, res) => {
    const result = await articleRepository.removeHighlight(req.params.id, req.params.highlightId);
    if (!result.success) {
        throw new NotFoundError('Highlight bulunamadı');
    }
    return success(res, {}, 'Highlight silindi');
}));

// Not kaydet
router.post('/article/:id/notes', validate(schemas.notes), asyncHandler(async (req, res) => {
    const { notes } = req.body;
    const result = await articleRepository.saveNotes(req.params.id, notes);
    if (!result.success) {
        throw new NotFoundError('Makale bulunamadı');
    }
    return success(res, {}, 'Not kaydedildi');
}));

// === BACKUP / RESTORE ===

// Veritabanı yedeği al
router.get('/backup', asyncHandler(async (req, res) => {
    const db = require('../database');
    const backup = db.exportDatabase();

    // Dosya olarak indir
    const filename = `readlater-backup-${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    logger.info(`[BACKUP] Yedek oluşturuldu: ${backup.stats.articles} makale, ${backup.stats.highlights} highlight`);

    return res.json(backup);
}));

// Yedekten geri yükle
router.post('/restore', validate(schemas.restore), asyncHandler(async (req, res) => {
    const db = require('../database');
    const { backup, mode } = req.body;

    logger.info(`[RESTORE] Geri yükleme başlatıldı (mod: ${mode})`);

    const result = db.importDatabase(backup, mode);

    logger.info(`[RESTORE] Tamamlandı: ${result.importedArticles} eklendi, ${result.skippedArticles} atlandı`);

    return success(res, {
        imported: result.importedArticles,
        skipped: result.skippedArticles,
        highlights: result.importedHighlights
    }, `Geri yükleme tamamlandı: ${result.importedArticles} makale eklendi`);
}));

module.exports = router;
