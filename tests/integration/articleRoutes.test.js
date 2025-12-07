// tests/integration/articleRoutes.test.js - API Integration Tests

const request = require('supertest');
const app = require('../../server');

describe('Article Routes', () => {
    describe('GET /api/articles', () => {
        test('should return articles list', async () => {
            const response = await request(app)
                .get('/api/articles')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.articles)).toBe(true);
        });
    });

    describe('GET /api/archived', () => {
        test('should return archived articles list', async () => {
            const response = await request(app)
                .get('/api/archived')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.articles)).toBe(true);
        });
    });

    describe('POST /api/save', () => {
        test('should reject empty URL', async () => {
            const response = await request(app)
                .post('/api/save')
                .send({})
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should reject invalid URL', async () => {
            const response = await request(app)
                .post('/api/save')
                .send({ url: 'not-a-url' })
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/article/:id', () => {
        test('should return 404 for non-existent article', async () => {
            const response = await request(app)
                .get('/api/article/999999')
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/article/:id', () => {
        test('should return 404 for non-existent article', async () => {
            const response = await request(app)
                .delete('/api/article/999999')
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/article/:id/highlight', () => {
        test('should reject empty highlight text', async () => {
            const response = await request(app)
                .post('/api/article/1/highlight')
                .send({})
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });
});

describe('Health Routes', () => {
    describe('GET /health', () => {
        test('should return health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.status).toBe('ok');
            expect(response.body.uptime).toBeDefined();
        });
    });

    describe('GET /ready', () => {
        test('should return ready status', async () => {
            const response = await request(app)
                .get('/ready')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.ready).toBe(true);
        });
    });
});
