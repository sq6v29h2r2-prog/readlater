// repositories/ArticleRepository.js - Repository Pattern ile veritabanı soyutlaması

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'articles.json');

class ArticleRepository {
    constructor() {
        this.dbPath = DB_PATH;
        this.ensureDataDir();
    }

    // Data klasörünü oluştur
    ensureDataDir() {
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    // Veritabanını yükle
    load() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('[DB] Veritabanı yüklenirken hata:', error.message);
        }
        return { articles: [], nextId: 1 };
    }

    // Veritabanını kaydet
    save(db) {
        fs.writeFileSync(this.dbPath, JSON.stringify(db, null, 2), 'utf8');
    }

    // === CRUD İŞLEMLERİ ===

    // Tüm makaleleri getir (arşivlenmemiş)
    findAll() {
        const db = this.load();
        return db.articles
            .filter(a => !a.archivedAt)
            .map(this.toDTO);
    }

    // Arşivlenmiş makaleleri getir
    findArchived() {
        const db = this.load();
        return db.articles
            .filter(a => a.archivedAt)
            .map(this.toDTO);
    }

    // ID ile makale bul
    findById(id) {
        const db = this.load();
        const article = db.articles.find(a => a.id === parseInt(id));
        return article ? this.toDetailDTO(article) : null;
    }

    // URL ile makale bul
    findByUrl(url) {
        const db = this.load();
        return db.articles.find(a => a.url === url);
    }

    // Yeni makale ekle
    create(articleData) {
        const db = this.load();

        const article = {
            id: db.nextId++,
            url: articleData.url,
            title: articleData.title || null,
            content: articleData.content || null,
            excerpt: articleData.excerpt || null,
            author: articleData.author || null,
            siteName: articleData.siteName || null,
            savedAt: new Date().toISOString(),
            readAt: null,
            archivedAt: null,
            highlights: [],
            notes: '',
            error: articleData.error || null
        };

        db.articles.unshift(article);
        this.save(db);

        return { lastInsertRowid: article.id, article };
    }

    // Makale güncelle
    update(id, updates) {
        const db = this.load();
        const index = db.articles.findIndex(a => a.id === parseInt(id));

        if (index === -1) return { success: false };

        db.articles[index] = { ...db.articles[index], ...updates };
        this.save(db);

        return { success: true, article: db.articles[index] };
    }

    // Makale sil
    delete(id) {
        const db = this.load();
        const index = db.articles.findIndex(a => a.id === parseInt(id));

        if (index === -1) return { success: false };

        db.articles.splice(index, 1);
        this.save(db);

        return { success: true };
    }

    // === ÖZEL İŞLEMLER ===

    // Okundu olarak işaretle
    markAsRead(id) {
        return this.update(id, { readAt: new Date().toISOString() });
    }

    // Arşive taşı
    archive(id) {
        return this.update(id, { archivedAt: new Date().toISOString() });
    }

    // Arşivden çıkar
    unarchive(id) {
        return this.update(id, { archivedAt: null });
    }

    // Highlight ekle
    addHighlight(id, text) {
        const db = this.load();
        const article = db.articles.find(a => a.id === parseInt(id));

        if (!article) return { success: false };

        if (!article.highlights) article.highlights = [];

        const highlight = {
            id: Date.now(),
            text,
            createdAt: new Date().toISOString()
        };

        article.highlights.push(highlight);
        this.save(db);

        return { success: true, highlight };
    }

    // Highlight sil
    removeHighlight(articleId, highlightId) {
        const db = this.load();
        const article = db.articles.find(a => a.id === parseInt(articleId));

        if (!article?.highlights) return { success: false };

        const index = article.highlights.findIndex(h => h.id === parseInt(highlightId));
        if (index === -1) return { success: false };

        article.highlights.splice(index, 1);
        this.save(db);

        return { success: true };
    }

    // Not kaydet
    saveNotes(id, notes) {
        return this.update(id, { notes });
    }

    // === DTO DÖNÜŞÜMLER ===

    // Liste görünümü için DTO
    toDTO(article) {
        return {
            id: article.id,
            url: article.url,
            title: article.title,
            excerpt: article.excerpt,
            site_name: article.siteName,
            saved_at: article.savedAt,
            read_at: article.readAt,
            archived_at: article.archivedAt,
            error: article.error
        };
    }

    // Detay görünümü için DTO
    toDetailDTO(article) {
        return {
            id: article.id,
            url: article.url,
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            author: article.author,
            site_name: article.siteName,
            saved_at: article.savedAt,
            read_at: article.readAt,
            archived_at: article.archivedAt,
            highlights: article.highlights || [],
            notes: article.notes || '',
            error: article.error
        };
    }
}

// Singleton instance
const articleRepository = new ArticleRepository();

module.exports = articleRepository;
