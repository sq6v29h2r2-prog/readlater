// migrate-to-sqlite.js - Tek seferlik migration script
// Kullanım: node migrate-to-sqlite.js

const path = require('path');
const fs = require('fs');

// Yeni database modülünü yükle
const database = require('./database');

// Eski JSON dosyasının yolu
const jsonPath = path.join(__dirname, 'data', 'articles.json');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║          JSON → SQLite Migration Başlıyor                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// JSON dosyası var mı kontrol et
if (!fs.existsSync(jsonPath)) {
    console.log('❌ JSON dosyası bulunamadı:', jsonPath);
    console.log('   Eğer ilk kurulum ise bu normal, devam edebilirsiniz.');
    process.exit(0);
}

// JSON içeriğini oku
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const articles = jsonData.articles || [];

console.log(`📚 Bulunan makale sayısı: ${articles.length}\n`);

if (articles.length === 0) {
    console.log('✅ Taşınacak makale yok, çıkılıyor.');
    process.exit(0);
}

// Migration başlat
const result = database.migrateFromJson(jsonPath);

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                    Migration Sonucu                        ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║  Toplam makale:     ${String(result.total).padEnd(38)}║`);
console.log(`║  Başarıyla taşınan: ${String(result.migrated).padEnd(38)}║`);
console.log('╚════════════════════════════════════════════════════════════╝\n');

if (result.migrated === result.total) {
    console.log('🎉 Tüm makaleler başarıyla taşındı!\n');
    console.log('⚠️  ÖNEMLİ: Eski JSON dosyasını yedeklemek ister misiniz?');
    console.log('   Yedeklemek için çalıştırın:');
    console.log('   move data\\articles.json data\\articles.json.backup\n');
} else {
    console.log('⚠️  Bazı makaleler taşınamadı. Yukarıdaki hata mesajlarını kontrol edin.\n');
}

// Doğrulama
const allArticles = database.getAllArticles();
const archivedArticles = database.getArchivedArticles();

console.log('📊 SQLite Veritabanı Durumu:');
console.log(`   Aktif makaleler:    ${allArticles.length}`);
console.log(`   Arşivli makaleler:  ${archivedArticles.length}`);
console.log(`   Toplam:             ${allArticles.length + archivedArticles.length}\n`);

console.log('✅ Migration tamamlandı. Artık sunucuyu başlatabilirsiniz: npm start');
