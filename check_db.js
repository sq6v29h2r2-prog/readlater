const { db } = require('./database');

const highlights = db.prepare('SELECT * FROM highlights ORDER BY id DESC LIMIT 5').all();
console.log('Son 5 Highlight:');
highlights.forEach(h => {
    console.log(`- [Article ID: ${h.article_id}] ${h.text.substring(0, 50)}...`);
});

const articlesWithHighlights = db.prepare('SELECT id, title FROM articles WHERE id IN (SELECT DISTINCT article_id FROM highlights)').all();
console.log('\nHighlight içeren makaleler:');
articlesWithHighlights.forEach(a => {
    console.log(`- [${a.id}] ${a.title}`);
});
