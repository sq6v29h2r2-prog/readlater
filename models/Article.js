const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    title: { type: String },
    site_name: { type: String },
    excerpt: { type: String },
    content: { type: String }, // HTML content
    textContent: { type: String },
    length: { type: Number },
    byline: { type: String },
    dir: { type: String },
    saved_at: { type: Date, default: Date.now },
    read_at: { type: Date },
    is_archived: { type: Boolean, default: false },
    highlights: [
        {
            id: { type: String },
            text: { type: String },
            color: { type: String },
            created_at: { type: String }
        }
    ],
    notes: { type: String },
    error: { type: String }
});

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
