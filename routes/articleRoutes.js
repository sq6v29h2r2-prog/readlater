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

// Tüm makaleleri listele
router.get('/articles', asyncHandler(async (req, res) => {
    const articles = articleRepository.findAll();
    return success(res, { articles });
}));

// Arşivlenmiş makaleleri listele
router.get('/archived', asyncHandler(async (req, res) => {
    const articles = articleRepository.findArchived();
    return success(res, { articles });
}));

// Tek makale getir
router.get('/article/:id', asyncHandler(async (req, res) => {
    const article = articleRepository.findById(req.params.id);
    if (!article) {
        throw new NotFoundError('Makale bulunamadı');
    }
    articleRepository.markAsRead(req.params.id);
    return success(res, { article });
}));

// Makale sil
router.delete('/article/:id', asyncHandler(async (req, res) => {
    const result = articleRepository.delete(req.params.id);
    if (!result.success) {
        throw new NotFoundError('Makale bulunamadı');
    }
    return success(res, {}, 'Makale silindi');
}));

// Arşive taşı
router.post('/article/:id/archive', asyncHandler(async (req, res) => {
    const result = articleRepository.archive(req.params.id);
    if (!result.success) {
        throw new NotFoundError('Makale bulunamadı');
    }
    return success(res, {}, 'Makale arşive taşındı');
}));

// Arşivden çıkar
router.post('/article/:id/unarchive', asyncHandler(async (req, res) => {
    const result = articleRepository.unarchive(req.params.id);
    if (!result.success) {
        throw new NotFoundError('Makale bulunamadı');
    }
    return success(res, {}, 'Makale arşivden çıkarıldı');
}));

// Highlight ekle
router.post('/article/:id/highlight', validate(schemas.highlight), asyncHandler(async (req, res) => {
    const { text } = req.body;
    const result = articleRepository.addHighlight(req.params.id, text);
    if (!result.success) {
        throw new NotFoundError('Makale bulunamadı');
    }
    return success(res, { highlight: result.highlight }, 'Highlight eklendi');
}));

// Highlight sil
router.delete('/article/:id/highlight/:highlightId', asyncHandler(async (req, res) => {
    const result = articleRepository.removeHighlight(req.params.id, req.params.highlightId);
    if (!result.success) {
        throw new NotFoundError('Highlight bulunamadı');
    }
    return success(res, {}, 'Highlight silindi');
}));

// Not kaydet
router.post('/article/:id/notes', validate(schemas.notes), asyncHandler(async (req, res) => {
    const { notes } = req.body;
    const result = articleRepository.saveNotes(req.params.id, notes);
    if (!result.success) {
        throw new NotFoundError('Makale bulunamadı');
    }
    return success(res, {}, 'Not kaydedildi');
}));

module.exports = router;
