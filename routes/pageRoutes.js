// routes/pageRoutes.js - Sayfa route'ları

const express = require('express');
const path = require('path');
const router = express.Router();

// Ana sayfa
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Arşiv sayfası
router.get('/archive', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'archive.html'));
});

// Okuma sayfası
router.get('/read/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'reader.html'));
});

module.exports = router;
