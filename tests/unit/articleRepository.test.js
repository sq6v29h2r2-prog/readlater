// tests/unit/articleRepository.test.js - Article Repository Unit Tests

const path = require('path');
const fs = require('fs');

// Test için ayrı bir veritabanı kullan
const TEST_DB_PATH = path.join(__dirname, '..', 'test-data', 'articles.json');

// Repository'yi test modunda yüklemeden önce temizle
beforeAll(() => {
    const testDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
    if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
    }
});

// Her testten sonra temizle
afterEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
    }
});

describe('ArticleRepository', () => {
    // Not: Gerçek testlerde repository'yi mocklamak veya 
    // test veritabanı ile çalıştırmak gerekir

    describe('Basic CRUD', () => {
        test('should be importable', () => {
            const articleRepository = require('../../repositories/ArticleRepository');
            expect(articleRepository).toBeDefined();
        });

        test('should have required methods', () => {
            const articleRepository = require('../../repositories/ArticleRepository');
            expect(typeof articleRepository.findAll).toBe('function');
            expect(typeof articleRepository.findById).toBe('function');
            expect(typeof articleRepository.create).toBe('function');
            expect(typeof articleRepository.delete).toBe('function');
        });
    });

    describe('findAll', () => {
        test('should return array', () => {
            const articleRepository = require('../../repositories/ArticleRepository');
            const articles = articleRepository.findAll();
            expect(Array.isArray(articles)).toBe(true);
        });
    });

    describe('create', () => {
        test('should create article with required fields', () => {
            const articleRepository = require('../../repositories/ArticleRepository');

            const articleData = {
                url: 'https://example.com/test',
                title: 'Test Article',
                content: '<p>Test content</p>',
                excerpt: 'Test excerpt',
                author: 'Test Author',
                siteName: 'example.com'
            };

            const result = articleRepository.create(articleData);
            expect(result).toBeDefined();
            expect(result.article.url).toBe(articleData.url);
            expect(result.article.title).toBe(articleData.title);
        });
    });

    describe('findByUrl', () => {
        test('should find article by URL', () => {
            const articleRepository = require('../../repositories/ArticleRepository');

            const url = 'https://example.com/unique-' + Date.now();
            articleRepository.create({
                url,
                title: 'Test',
                content: 'Test',
                siteName: 'example.com'
            });

            const found = articleRepository.findByUrl(url);
            expect(found).toBeDefined();
            expect(found.url).toBe(url);
        });

        test('should return undefined for non-existent URL', () => {
            const articleRepository = require('../../repositories/ArticleRepository');
            const found = articleRepository.findByUrl('https://nonexistent.com/' + Date.now());
            expect(found).toBeUndefined();
        });
    });
});
