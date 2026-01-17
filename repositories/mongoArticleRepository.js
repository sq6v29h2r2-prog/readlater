const Article = require('../models/Article');

class MongoArticleRepository {
    async findAll(page = null, limit = 50) {
        const query = Article.find({ is_archived: false })
            .select('-content') // Exclude heavy content field from list view
            .sort({ saved_at: -1 });

        if (page !== null) {
            const skip = (page - 1) * limit;
            query.skip(skip).limit(limit);
        }

        return await query;
    }

    async findArchived(page = null, limit = 50) {
        const query = Article.find({ is_archived: true })
            .select('-content') // Exclude heavy content field from list view
            .sort({ saved_at: -1 });

        if (page !== null) {
            const skip = (page - 1) * limit;
            query.skip(skip).limit(limit);
        }

        return await query;
    }

    async count() {
        return await Article.countDocuments({ is_archived: false });
    }

    async countArchived() {
        return await Article.countDocuments({ is_archived: true });
    }

    async findById(id) {
        return await Article.findOne({ id: String(id) });
    }

    async findByUrl(url) {
        return await Article.findOne({ url });
    }

    async create(articleData) {
        try {
            // MongoDB ID handling - ensure we have a string ID if not provided
            if (!articleData.id) {
                articleData.id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
            }
            const article = new Article(articleData);
            const saved = await article.save();
            return { success: true, lastInsertRowid: saved.id, article: saved };
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
        const result = await Article.updateOne({ id: String(id) }, { read_at: new Date() });
        return { success: result.modifiedCount > 0 || result.matchedCount > 0 };
    }

    async unmarkAsRead(id) {
        const result = await Article.updateOne({ id: String(id) }, { read_at: null });
        return { success: result.modifiedCount > 0 || result.matchedCount > 0 };
    }

    async addHighlight(articleId, text, color) {
        const article = await this.findById(articleId);
        if (!article) return { success: false };

        const highlightId = Date.now().toString();
        const highlight = { id: highlightId, text, color, created_at: new Date().toISOString() };

        if (!article.highlights) article.highlights = [];
        article.highlights.push(highlight);

        // Mongoose doesn't always track nested shifts in mixed arrays if schema isn't strictly defined for them
        // But here we rely on the schema or markModified if needed.
        // Let's assume schema has highlights or we use Article.updateOne with $push
        await Article.updateOne({ id: String(articleId) }, { $push: { highlights: highlight } });
        return { success: true, highlight };
    }

    async removeHighlight(articleId, highlightId) {
        const result = await Article.updateOne(
            { id: String(articleId) },
            { $pull: { highlights: { id: String(highlightId) } } }
        );
        return { success: result.modifiedCount > 0 };
    }

    async saveNotes(articleId, notes) {
        const result = await Article.updateOne({ id: String(articleId) }, { notes });
        return { success: result.modifiedCount > 0 || result.matchedCount > 0 };
    }

    async findOne(filter) {
        return await Article.findOne(filter);
    }
}

module.exports = new MongoArticleRepository();
