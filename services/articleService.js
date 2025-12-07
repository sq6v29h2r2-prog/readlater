// services/articleService.js - Makale işlemleri servisi (Repository Pattern)

const { articleRepository } = require('../repositories');
const { fetchAndParse, parseHtml } = require('./contentService');

// URL'den makale kaydet
async function saveArticleFromUrl(url) {
    // Önce var mı kontrol et
    const existing = articleRepository.findByUrl(url);
    if (existing) {
        return { exists: true, article: existing };
    }

    const article = await fetchAndParse(url);

    const result = articleRepository.create({
        url,
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        author: article.author,
        siteName: article.siteName,
        error: null
    });

    console.log(`[SAVE] Başarılı: ${article.title}`);

    return {
        success: true,
        article: {
            id: result.lastInsertRowid,
            title: article.title,
            siteName: article.siteName
        }
    };
}

// HTML'den makale kaydet (extension'dan)
async function saveArticleFromHtml(url, html) {
    // Önce var mı kontrol et
    const existing = articleRepository.findByUrl(url);
    if (existing) {
        return { exists: true, article: existing };
    }

    const article = parseHtml(html, url);

    const result = articleRepository.create({
        url,
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        author: article.author,
        siteName: article.siteName,
        error: null
    });

    console.log(`[SAVE-DIRECT] Başarılı: ${article.title}`);

    return {
        success: true,
        article: {
            id: result.lastInsertRowid,
            title: article.title,
            siteName: article.siteName
        }
    };
}

// Hatalı makale kaydet
function saveErrorArticle(url, errorMessage) {
    return articleRepository.create({
        url,
        title: `Hata: ${new URL(url).hostname}`,
        content: null,
        excerpt: null,
        author: null,
        siteName: new URL(url).hostname,
        error: errorMessage
    });
}

module.exports = {
    saveArticleFromUrl,
    saveArticleFromHtml,
    saveErrorArticle
};
