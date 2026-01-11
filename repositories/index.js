const config = require('../config');

// MongoDB ayarı varsa Mongo repository'yi kullan
const articleRepository = config.mongodbUri
    ? require('./mongoArticleRepository')
    : require('./ArticleRepository');

module.exports = {
    articleRepository
};
