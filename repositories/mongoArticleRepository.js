const Article = require('../models/Article');

class MongoArticleRepository {
    async findAll() {
        return await Article.find({ is_archived: false }).sort({ saved_at: -1 });
    }

    async findArchived() {
        return await Article.find({ is_archived: true }).sort({ saved_at: -1 });
    }

    async findById(id) {
        return await Article.findOne({ id: String(id) });
    }

    async findByUrl(url) {
        return await Article.findOne({ url });
    }

    async create(articleData) {
        try {
            const article = new Article(articleData);
            const saved = await article.save();
            return { lastInsertRowid: saved.id, article: saved };
        } catch (error) {
            // MongoDB duplicate key error check (11000)
            if (error.code === 11000) {
                const existing = await this.findByUrl(articleData.url);
                return { exists: true, article: existing };
            }
            throw error;
        }
    }

    async delete(id) {
        const result = await Article.deleteOne({ id: String(id) });
        return { success: result.deletedCount > 0 };
    }

    async archive(id) {
        const result = await Article.updateOne({ id: String(id) }, { is_archived: true });
        return { success: result.modifiedCount > 0 };
    }

    async unarchive(id) {
        const result = await Article.updateOne({ id: String(id) }, { is_archived: false });
        return { success: result.modifiedCount > 0 };
    }

    async markAsRead(id) {
        return await Article.updateOne({ id: String(id) }, { read_at: new Date() });
    }

    async findOne(filter) {
        return await Article.findOne(filter);
    }
}

module.exports = new MongoArticleRepository();
