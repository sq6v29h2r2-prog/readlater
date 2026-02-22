// repositories/ArticleRepository.js - Repository Pattern ile SQLite veritabanı

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'articles.db');

class ArticleRepository {
    constructor() {
        this.ensureDataDir();
        this.db = new Database(DB_PATH);
        this.initDatabase();
        this.prepareStatements();
    }

    // Data klasörünü oluştur
    ensureDataDir() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
    }

    // Veritabanı tablolarını oluştur
    initDatabase() {
        // WAL mode - daha iyi performans
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                title TEXT,
                content TEXT,
                excerpt TEXT,
                author TEXT,
                site_name TEXT,
                saved_at TEXT DEFAULT (datetime('now', 'localtime')),
                read_at TEXT,
                archived_at TEXT,
                notes TEXT DEFAULT '',
                error TEXT
            );

            CREATE TABLE IF NOT EXISTS highlights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                article_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                start_offset INTEGER,
                end_offset INTEGER,
                color TEXT DEFAULT 'yellow',
                created_at TEXT DEFAULT (datetime('now', 'localtime')),
                FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url);
            CREATE INDEX IF NOT EXISTS idx_articles_archived ON articles(archived_at);
            CREATE INDEX IF NOT EXISTS idx_highlights_article ON highlights(article_id);
        `);

        // Migration: Eski tabloda color sütunu yoksa ekle
        try {
            const tableInfo = this.db.prepare("PRAGMA table_info(highlights)").all();
            const hasColorColumn = tableInfo.some(col => col.name === 'color');
            if (!hasColorColumn) {
                this.db.exec("ALTER TABLE highlights ADD COLUMN color TEXT DEFAULT 'yellow'");
                console.log('[DB] Migration: highlights tablosuna color sütunu eklendi');
            }
        } catch (err) {
            console.log('[DB] Migration kontrolü atlandı:', err.message);
        }
    }

    // Prepared statements (performans için)
    prepareStatements() {
        this.statements = {
            // Article CRUD
            insert: this.db.prepare(`
                INSERT INTO articles (url, title, content, excerpt, author, site_name, error)
                VALUES (@url, @title, @content, @excerpt, @author, @siteName, @error)
            `),

            findByUrl: this.db.prepare('SELECT * FROM articles WHERE url = ?'),

            findById: this.db.prepare('SELECT * FROM articles WHERE id = ?'),

            findAll: this.db.prepare(`
                SELECT id, url, title, excerpt, author, site_name, saved_at, read_at, archived_at, error
                FROM articles
                WHERE archived_at IS NULL
                ORDER BY saved_at DESC
            `),

            findAllPaginated: this.db.prepare(`
                SELECT id, url, title, excerpt, author, site_name, saved_at, read_at, archived_at, error
                FROM articles
                WHERE archived_at IS NULL
                ORDER BY saved_at DESC
                LIMIT ? OFFSET ?
            `),

            findArchived: this.db.prepare(`
                SELECT id, url, title, excerpt, author, site_name, saved_at, read_at, archived_at, error
                FROM articles
                WHERE archived_at IS NOT NULL
                ORDER BY archived_at DESC
            `),

            findArchivedPaginated: this.db.prepare(`
                SELECT id, url, title, excerpt, author, site_name, saved_at, read_at, archived_at, error
                FROM articles
                WHERE archived_at IS NOT NULL
                ORDER BY archived_at DESC
                LIMIT ? OFFSET ?
            `),

            countAll: this.db.prepare('SELECT COUNT(*) as count FROM articles WHERE archived_at IS NULL'),

            countArchived: this.db.prepare('SELECT COUNT(*) as count FROM articles WHERE archived_at IS NOT NULL'),

            delete: this.db.prepare('DELETE FROM articles WHERE id = ?'),

            markAsRead: this.db.prepare(`
                UPDATE articles SET read_at = datetime('now', 'localtime') WHERE id = ?
            `),

            archive: this.db.prepare(`
                UPDATE articles SET archived_at = datetime('now', 'localtime') WHERE id = ?
            `),

            unarchive: this.db.prepare('UPDATE articles SET archived_at = NULL WHERE id = ?'),

            unmarkAsRead: this.db.prepare(`
                UPDATE articles SET read_at = NULL WHERE id = ?
            `),

            updateNotes: this.db.prepare('UPDATE articles SET notes = ? WHERE id = ?'),

            // Highlights
            addHighlight: this.db.prepare(`
                INSERT INTO highlights (article_id, text, start_offset, end_offset, color)
                VALUES (?, ?, ?, ?, ?)
            `),

            getHighlights: this.db.prepare('SELECT * FROM highlights WHERE article_id = ? ORDER BY created_at'),

            removeHighlight: this.db.prepare('DELETE FROM highlights WHERE id = ? AND article_id = ?')
        };
    }

    // === CRUD İŞLEMLERİ ===

    // Tüm makaleleri getir (arşivlenmemiş)
    findAll(page = null, limit = 50) {
        if (page === null) {
            // Pagination olmadan (geriye dönük uyumluluk)
            const articles = this.statements.findAll.all();
            return articles.map(this.toDTO);
        }

        // Pagination ile
        const offset = (page - 1) * limit;
        const articles = this.statements.findAllPaginated.all(limit, offset);
        return articles.map(this.toDTO);
    }

    // Arşivlenmiş makaleleri getir
    findArchived(page = null, limit = 50) {
        if (page === null) {
            // Pagination olmadan (geriye dönük uyumluluk)
            const articles = this.statements.findArchived.all();
            return articles.map(this.toDTO);
        }

        // Pagination ile
        const offset = (page - 1) * limit;
        const articles = this.statements.findArchivedPaginated.all(limit, offset);
        return articles.map(this.toDTO);
    }

    // Toplam makale sayısı (arşivlenmemiş)
    count() {
        return this.statements.countAll.get().count;
    }

    // Toplam arşivlenmiş makale sayısı
    countArchived() {
        return this.statements.countArchived.get().count;
    }

    // ID ile makale bul
    findById(id) {
        const article = this.statements.findById.get(parseInt(id));
        if (!article) return null;

        // Highlights'ları da getir
        const highlights = this.statements.getHighlights.all(parseInt(id));
        article.highlights = highlights || [];

        return this.toDetailDTO(article);
    }

    // URL ile makale bul
    findByUrl(url) {
        return this.statements.findByUrl.get(url) || null;
    }

    // Yeni makale ekle
    create(articleData) {
        try {
            const result = this.statements.insert.run({
                url: articleData.url,
                title: articleData.title || null,
                content: articleData.content || null,
                excerpt: articleData.excerpt || null,
                author: articleData.author || null,
                siteName: articleData.siteName || null,
                error: articleData.error || null
            });

            const article = this.statements.findById.get(result.lastInsertRowid);
            return { lastInsertRowid: result.lastInsertRowid, article };
        } catch (error) {
            // UNIQUE constraint hatası
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                const existing = this.findByUrl(articleData.url);
                return { exists: true, article: existing };
            }
            throw error;
        }
    }

    // Makale sil
    delete(id) {
        const result = this.statements.delete.run(parseInt(id));
        return { success: result.changes > 0 };
    }

    // === ÖZEL İŞLEMLER ===

    // Okundu olarak işaretle
    markAsRead(id) {
        const result = this.statements.markAsRead.run(parseInt(id));
        return { success: result.changes > 0 };
    }

    // Okunmadı olarak işaretle
    unmarkAsRead(id) {
        const result = this.statements.unmarkAsRead.run(parseInt(id));
        return { success: result.changes > 0 };
    }

    // Arşive taşı
    archive(id) {
        const result = this.statements.archive.run(parseInt(id));
        return { success: result.changes > 0 };
    }

    // Arşivden çıkar
    unarchive(id) {
        const result = this.statements.unarchive.run(parseInt(id));
        return { success: result.changes > 0 };
    }

    // Highlight ekle
    addHighlight(articleId, text, color = 'yellow', startOffset = null, endOffset = null) {
        try {
            const result = this.statements.addHighlight.run(
                parseInt(articleId),
                text,
                startOffset,
                endOffset,
                color
            );

            return {
                success: true,
                highlight: {
                    id: result.lastInsertRowid,
                    text,
                    createdAt: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('[DB] Highlight eklenirken hata:', error.message);
            return { success: false };
        }
    }

    // Highlight sil
    removeHighlight(articleId, highlightId) {
        const result = this.statements.removeHighlight.run(
            parseInt(highlightId),
            parseInt(articleId)
        );
        return { success: result.changes > 0 };
    }

    // Not kaydet
    saveNotes(id, notes) {
        const result = this.statements.updateNotes.run(notes, parseInt(id));
        return { success: result.changes > 0 };
    }

    // === DTO DÖNÜŞÜMLER ===

    // Liste görünümü için DTO
    toDTO(article) {
        return {
            id: article.id,
            url: article.url,
            title: article.title,
            excerpt: article.excerpt,
            site_name: article.site_name,
            saved_at: article.saved_at,
            read_at: article.read_at,
            archived_at: article.archived_at,
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
            site_name: article.site_name,
            saved_at: article.saved_at,
            read_at: article.read_at,
            notes: article.notes || '',
            highlights: article.highlights || [],
            error: article.error
        };
    }

    // Veritabanını kapat
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

// Singleton instance
const articleRepository = new ArticleRepository();

// Process kapanırken veritabanını kapat
process.on('exit', () => articleRepository.close());
process.on('SIGINT', () => {
    articleRepository.close();
    process.exit(0);
});

module.exports = articleRepository;
