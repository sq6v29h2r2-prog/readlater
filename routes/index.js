// routes/index.js - Tüm route'ların export edildiği ana dosya

const articleRoutes = require('./articleRoutes');
const pageRoutes = require('./pageRoutes');
const healthRoutes = require('./healthRoutes');

module.exports = {
    articleRoutes,
    pageRoutes,
    healthRoutes
};
