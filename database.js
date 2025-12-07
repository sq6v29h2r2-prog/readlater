const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'articles.json');

// Veritabanını yükle
function loadDb() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Veritabanı okuma hatası:', error.message);
  }
  return { articles: [], nextId: 1 };
}

// Veritabanını kaydet
function saveDb(db) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Veritabanı yazma hatası:', error.message);
  }
}

// URL zaten kayıtlı mı kontrol et
function checkUrlExists(url) {
  const db = loadDb();
  return db.articles.find(a => a.url === url);
}

// Makale kaydet
function saveArticle(data) {
  const db = loadDb();

  // URL zaten var mı kontrol et - varsa kaydetme
  const existing = db.articles.find(a => a.url === data.url);
  if (existing) {
    return { exists: true, article: existing };
  }

  const article = {
    id: db.nextId++,
    url: data.url,
    title: data.title || null,
    content: data.content || null,
    excerpt: data.excerpt || null,
    author: data.author || null,
    siteName: data.siteName || null,
    savedAt: new Date().toISOString(),
    readAt: null,
    archivedAt: null,
    highlights: [],
    notes: '',  // Makale notu
    error: data.error || null
  };

  db.articles.unshift(article);
  saveDb(db);
  return { lastInsertRowid: article.id, exists: false };
}

// Tüm makaleleri getir (arşivlenmemişler)
function getAllArticles() {
  const db = loadDb();
  return db.articles
    .filter(a => !a.archivedAt)  // Arşivlenmemişleri göster
    .map(a => ({
      id: a.id,
      url: a.url,
      title: a.title,
      excerpt: a.excerpt,
      author: a.author,
      site_name: a.siteName,
      saved_at: a.savedAt,
      read_at: a.readAt,
      archived_at: a.archivedAt,
      error: a.error
    }));
}

// Arşivlenmiş makaleleri getir
function getArchivedArticles() {
  const db = loadDb();
  return db.articles
    .filter(a => a.archivedAt)  // Arşivlenenleri göster
    .map(a => ({
      id: a.id,
      url: a.url,
      title: a.title,
      excerpt: a.excerpt,
      author: a.author,
      site_name: a.siteName,
      saved_at: a.savedAt,
      read_at: a.readAt,
      archived_at: a.archivedAt,
      error: a.error
    }));
}

// Tek makale getir
function getArticle(id) {
  const db = loadDb();
  const article = db.articles.find(a => a.id === parseInt(id));
  if (!article) return null;

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

// Makale sil
function deleteArticle(id) {
  const db = loadDb();
  const index = db.articles.findIndex(a => a.id === parseInt(id));
  if (index >= 0) {
    db.articles.splice(index, 1);
    saveDb(db);
  }
  return { changes: index >= 0 ? 1 : 0 };
}

// Okundu işaretle
function markAsRead(id) {
  const db = loadDb();
  const article = db.articles.find(a => a.id === parseInt(id));
  if (article) {
    article.readAt = new Date().toISOString();
    saveDb(db);
  }
  return { changes: article ? 1 : 0 };
}

// Arşive taşı
function archiveArticle(id) {
  const db = loadDb();
  const article = db.articles.find(a => a.id === parseInt(id));
  if (article) {
    article.archivedAt = new Date().toISOString();
    saveDb(db);
    return { success: true };
  }
  return { success: false };
}

// Arşivden çıkar
function unarchiveArticle(id) {
  const db = loadDb();
  const article = db.articles.find(a => a.id === parseInt(id));
  if (article) {
    article.archivedAt = null;
    saveDb(db);
    return { success: true };
  }
  return { success: false };
}

// Highlight kaydet
function saveHighlight(articleId, highlight) {
  const db = loadDb();
  const article = db.articles.find(a => a.id === parseInt(articleId));
  if (article) {
    if (!article.highlights) article.highlights = [];
    article.highlights.push({
      id: Date.now(),
      text: highlight.text,
      startOffset: highlight.startOffset,
      endOffset: highlight.endOffset,
      createdAt: new Date().toISOString()
    });
    saveDb(db);
    return { success: true };
  }
  return { success: false };
}

// Highlight sil
function deleteHighlight(articleId, highlightId) {
  const db = loadDb();
  const article = db.articles.find(a => a.id === parseInt(articleId));
  if (article && article.highlights) {
    const index = article.highlights.findIndex(h => h.id === parseInt(highlightId));
    if (index >= 0) {
      article.highlights.splice(index, 1);
      saveDb(db);
      return { success: true };
    }
  }
  return { success: false };
}

// Not kaydet
function saveNotes(articleId, notes) {
  const db = loadDb();
  const article = db.articles.find(a => a.id === parseInt(articleId));
  if (article) {
    article.notes = notes;
    saveDb(db);
    return { success: true };
  }
  return { success: false };
}

module.exports = {
  saveArticle,
  getAllArticles,
  getArchivedArticles,
  getArticle,
  deleteArticle,
  markAsRead,
  archiveArticle,
  unarchiveArticle,
  saveHighlight,
  deleteHighlight,
  checkUrlExists,
  saveNotes
};
