const mongoose = require('mongoose');
const Database = require('better-sqlite3');
const path = require('path');
const config = require('./config');
const Article = require('./models/Article');

const migrate = async () => {
    if (!config.mongodbUri) {
        console.error('HATA: MONGODB_URI tanımlanmamış. Lütfen .env dosyanızı kontrol edin.');
        process.exit(1);
    }

    const dbPath = path.join(__dirname, 'data', 'articles.db');
    if (!require('fs').existsSync(dbPath)) {
        console.log('Bilgi: SQLite veritabanı bulunamadı (data/articles.db). Göç işlemi atlanıyor.');
        process.exit(0);
    }

    try {
        console.log("MongoDB'ye bağlanılıyor...");
        await mongoose.connect(config.mongodbUri);
        console.log('MongoDB bağlantısı başarılı.');

        console.log('SQLite veritabanına bağlanılıyor...');
        const db = new Database(dbPath);

        const articles = db.prepare('SELECT * FROM articles').all();
        console.log(`${articles.length} makale bulundu. Aktarılıyor...`);

        let successCount = 0;
        let skipCount = 0;

        for (const article of articles) {
            const existing = await Article.findOne({ id: String(article.id) });
            if (!existing) {
                // MongoDB modeline uygun hale getir
                const mongoData = {
                    id: String(article.id),
                    url: article.url,
                    title: article.title,
                    site_name: article.site_name,
                    excerpt: article.excerpt,
                    content: article.content,
                    textContent: article.textContent,
                    length: article.length,
                    byline: article.byline,
                    dir: article.dir,
                    saved_at: article.saved_at ? new Date(article.saved_at) : new Date(),
                    read_at: article.read_at ? new Date(article.read_at) : undefined,
                    is_archived: !!article.archived_at
                };
                await Article.create(mongoData);
                successCount++;
            } else {
                skipCount++;
            }
        }

        console.log('\n--- Göç Sonucu ---');
        console.log(`Başarıyla aktarıldı: ${successCount}`);
        console.log(`Zaten mevcut: ${skipCount}`);
        console.log('------------------');

        db.close();
        process.exit(0);
    } catch (error) {
        console.error('Göç sırasında hata oluştu:', error);
        process.exit(1);
    }
};

migrate();
