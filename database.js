// database.js - SQLite tabanlı veritabanı (Refactored)

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Data klasörünü oluştur
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'articles.db');
const db = new Database(dbPath);

// WAL mode - daha iyi performans ve concurrent erişim
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// === TABLO OLUŞTURMA ===

db.exec(`
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
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url);
    CREATE INDEX IF NOT EXISTS idx_articles_archived ON articles(archived_at);
    CREATE INDEX IF NOT EXISTS idx_highlights_article ON highlights(article_id);
`);

// === PREPARED STATEMENTS (Performans için) ===

const statements = {
    // Article CRUD
    insertArticle: db.prepare(`
        INSERT INTO articles (url, title, content, excerpt, author, site_name, error)
        VALUES (@url, @title, @content, @excerpt, @author, @siteName, @error)
    `),

    findByUrl: db.prepare('SELECT * FROM articles WHERE url = ?'),

    getById: db.prepare('SELECT * FROM articles WHERE id = ?'),

    getAllActive: db.prepare(`
        SELECT id, url, title, excerpt, author, site_name, saved_at, read_at, archived_at, error
        FROM articles 
        WHERE archived_at IS NULL 
        ORDER BY saved_at DESC
    `),

    getAllArchived: db.prepare(`
        SELECT id, url, title, excerpt, author, site_name, saved_at, read_at, archived_at, error
        FROM articles 
        WHERE archived_at IS NOT NULL 
        ORDER BY archived_at DESC
    `),

    deleteById: db.prepare('DELETE FROM articles WHERE id = ?'),

    markAsRead: db.prepare(`UPDATE articles SET read_at = datetime('now', 'localtime') WHERE id = ?`),

    unmarkAsRead: db.prepare(`UPDATE articles SET read_at = NULL WHERE id = ?`),

    archive: db.prepare(`UPDATE articles SET archived_at = datetime('now', 'localtime') WHERE id = ?`),

    unarchive: db.prepare('UPDATE articles SET archived_at = NULL WHERE id = ?'),

    updateNotes: db.prepare('UPDATE articles SET notes = ? WHERE id = ?'),

    // Highlights
    insertHighlight: db.prepare(`
        INSERT INTO highlights (article_id, text, start_offset, end_offset, color)
        VALUES (?, ?, ?, ?, ?)
    `),

    getHighlights: db.prepare('SELECT * FROM highlights WHERE article_id = ? ORDER BY created_at'),

    deleteHighlight: db.prepare('DELETE FROM highlights WHERE id = ? AND article_id = ?')
};

// === FONKSİYONLAR (Mevcut API ile uyumlu) ===

/**
 * URL zaten kayıtlı mı kontrol et
 */
function checkUrlExists(url) {
    return statements.findByUrl.get(url) || null;
}

/**
 * Makale kaydet
 */
function saveArticle(data) {
    // URL zaten var mı kontrol et
    const existing = checkUrlExists(data.url);
    if (existing) {
        return { exists: true, article: existing };
    }

    try {
        const result = statements.insertArticle.run({
            url: data.url,
            title: data.title || null,
            content: data.content || null,
            excerpt: data.excerpt || null,
            author: data.author || null,
            siteName: data.siteName || null,
            error: data.error || null
        });

        return { lastInsertRowid: result.lastInsertRowid, exists: false };
    } catch (error) {
        // UNIQUE constraint hatası (race condition durumunda)
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            const existing = checkUrlExists(data.url);
            return { exists: true, article: existing };
        }
        throw error;
    }
}

/**
 * Tüm aktif makaleleri getir (arşivlenmemiş)
 */
function getAllArticles() {
    return statements.getAllActive.all();
}

/**
 * Arşivlenmiş makaleleri getir
 */
function getArchivedArticles() {
    return statements.getAllArchived.all();
}

/**
 * Tek makale getir (highlights dahil)
 */
function getArticle(id) {
    const article = statements.getById.get(id);
    if (!article) return null;

    const highlights = statements.getHighlights.all(id);

    return {
        ...article,
        highlights: highlights || []
    };
}

/**
 * Makale sil
 */
function deleteArticle(id) {
    const result = statements.deleteById.run(id);
    return { changes: result.changes };
}

/**
 * Okundu işaretle
 */
function markAsRead(id) {
    const result = statements.markAsRead.run(id);
    return { changes: result.changes };
}

/**
 * Okunmadı işaretle
 */
function unmarkAsRead(id) {
    const result = statements.unmarkAsRead.run(id);
    return { changes: result.changes };
}

/**
 * Arşive taşı
 */
function archiveArticle(id) {
    const result = statements.archive.run(id);
    return { success: result.changes > 0 };
}

/**
 * Arşivden çıkar
 */
function unarchiveArticle(id) {
    const result = statements.unarchive.run(id);
    return { success: result.changes > 0 };
}

/**
 * Highlight kaydet
 */
function saveHighlight(articleId, highlight) {
    try {
        statements.insertHighlight.run(
            articleId,
            highlight.text,
            highlight.startOffset || null,
            highlight.endOffset || null,
            highlight.color || 'yellow'
        );
        return { success: true };
    } catch (error) {
        console.error('Highlight kaydetme hatası:', error.message);
        return { success: false };
    }
}

/**
 * Highlight sil
 */
function deleteHighlight(articleId, highlightId) {
    const result = statements.deleteHighlight.run(highlightId, articleId);
    return { success: result.changes > 0 };
}

/**
 * Not kaydet
 */
function saveNotes(articleId, notes) {
    const result = statements.updateNotes.run(notes, articleId);
    return { success: result.changes > 0 };
}

// === MIGRATION HELPER ===

/**
 * JSON'dan SQLite'a veri aktar
 */
function migrateFromJson(jsonPath) {
    if (!fs.existsSync(jsonPath)) {
        console.log('JSON dosyası bulunamadı, migration atlandı.');
        return { migrated: 0 };
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const articles = jsonData.articles || [];

    if (articles.length === 0) {
        console.log('Migration için makale bulunamadı.');
        return { migrated: 0 };
    }

    // Transaction ile toplu insert (hız için)
    const insertMany = db.transaction((articles) => {
        let migrated = 0;

        for (const article of articles) {
            try {
                // Önce URL kontrolü
                const existing = checkUrlExists(article.url);
                if (existing) {
                    console.log(`[SKIP] Zaten var: ${article.url}`);
                    continue;
                }

                db.prepare(`
                    INSERT INTO articles 
                    (url, title, content, excerpt, author, site_name, saved_at, read_at, archived_at, notes, error)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    article.url,
                    article.title,
                    article.content,
                    article.excerpt,
                    article.author,
                    article.siteName,
                    article.savedAt,
                    article.readAt,
                    article.archivedAt,
                    article.notes || '',
                    article.error
                );

                // Highlights varsa onları da aktar
                if (article.highlights && article.highlights.length > 0) {
                    const lastId = db.prepare('SELECT last_insert_rowid() as id').get().id;

                    for (const h of article.highlights) {
                        statements.insertHighlight.run(
                            lastId,
                            h.text,
                            h.startOffset,
                            h.endOffset
                        );
                    }
                }

                migrated++;
                console.log(`[MIGRATED] ${article.title || article.url}`);
            } catch (error) {
                console.error(`[ERROR] ${article.url}: ${error.message}`);
            }
        }

        return migrated;
    });

    const migrated = insertMany(articles);
    console.log(`\n✅ Migration tamamlandı: ${migrated}/${articles.length} makale aktarıldı.`);

    return { migrated, total: articles.length };
}

// === BACKUP / RESTORE ===

/**
 * Tüm veritabanını JSON olarak export et
 */
function exportDatabase() {
    const articles = db.prepare('SELECT * FROM articles').all();
    const highlights = db.prepare('SELECT * FROM highlights').all();

    return {
        version: '3.0',
        exportedAt: new Date().toISOString(),
        stats: {
            articles: articles.length,
            highlights: highlights.length
        },
        data: {
            articles,
            highlights
        }
    };
}

/**
 * JSON'dan veritabanına import et
 * @param {object} backup - Export edilen yedek verisi
 * @param {string} mode - 'merge' (mevcut veriyi koru) veya 'replace' (sil ve yükle)
 */
function importDatabase(backup, mode = 'merge') {
    if (!backup || !backup.data) {
        throw new Error('Geçersiz yedek formatı');
    }

    const { articles = [], highlights = [] } = backup.data;

    const importTransaction = db.transaction(() => {
        let importedArticles = 0;
        let skippedArticles = 0;
        let importedHighlights = 0;

        if (mode === 'replace') {
            // Tüm veriyi sil
            db.prepare('DELETE FROM highlights').run();
            db.prepare('DELETE FROM articles').run();
        }

        // Article ID mapping (eski ID -> yeni ID)
        const idMap = new Map();

        for (const article of articles) {
            // URL zaten var mı kontrol et
            const existing = checkUrlExists(article.url);
            if (existing) {
                idMap.set(article.id, existing.id);
                skippedArticles++;
                continue;
            }

            try {
                const result = db.prepare(`
                    INSERT INTO articles 
                    (url, title, content, excerpt, author, site_name, saved_at, read_at, archived_at, notes, error)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    article.url,
                    article.title,
                    article.content,
                    article.excerpt,
                    article.author,
                    article.site_name,
                    article.saved_at,
                    article.read_at,
                    article.archived_at,
                    article.notes || '',
                    article.error
                );

                idMap.set(article.id, result.lastInsertRowid);
                importedArticles++;
            } catch (error) {
                console.error(`[IMPORT] Article error: ${article.url}`, error.message);
            }
        }

        // Highlights import et (ID mapping kullanarak)
        for (const h of highlights) {
            const newArticleId = idMap.get(h.article_id);
            if (!newArticleId) continue; // Eğer makale skip edildiyse highlight da skip

            try {
                db.prepare(`
                    INSERT INTO highlights (article_id, text, start_offset, end_offset, created_at)
                    VALUES (?, ?, ?, ?, ?)
                `).run(
                    newArticleId,
                    h.text,
                    h.start_offset,
                    h.end_offset,
                    h.created_at
                );
                importedHighlights++;
            } catch (error) {
                console.error(`[IMPORT] Highlight error:`, error.message);
            }
        }

        return {
            importedArticles,
            skippedArticles,
            importedHighlights,
            total: articles.length
        };
    });

    return importTransaction();
}

// === CLEANUP ===

// Process kapanırken veritabanını düzgün kapat
// Not: SIGINT server.js'de graceful shutdown ile yönetiliyor
process.on('exit', () => db.close());

module.exports = {
    // Article işlemleri
    saveArticle,
    getAllArticles,
    getArchivedArticles,
    getArticle,
    deleteArticle,
    markAsRead,
    unmarkAsRead,
    archiveArticle,
    unarchiveArticle,
    checkUrlExists,

    // Highlight işlemleri
    saveHighlight,
    deleteHighlight,

    // Notes
    saveNotes,

    // Migration
    migrateFromJson,

    // Backup/Restore
    exportDatabase,
    importDatabase,

    // Direct DB access (gerekirse)
    db
};
