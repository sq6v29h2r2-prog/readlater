// services/index.js - Tüm servislerin export edildiği ana dosya

const contentService = require('./contentService');
const articleService = require('./articleService');

module.exports = {
    ...contentService,
    ...articleService
};
