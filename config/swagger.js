// config/swagger.js - Swagger/OpenAPI konfigürasyonu

const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ReadLater API',
            version: '1.0.0',
            description: 'Makale kaydetme ve okuma API\'si',
            contact: {
                name: 'ReadLater'
            }
        },
        servers: [
            {
                url: `http://localhost:${config.port}`,
                description: 'Geliştirme sunucusu'
            }
        ],
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key'
                }
            },
            schemas: {
                Article: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        url: { type: 'string' },
                        title: { type: 'string' },
                        content: { type: 'string' },
                        excerpt: { type: 'string' },
                        author: { type: 'string' },
                        site_name: { type: 'string' },
                        saved_at: { type: 'string', format: 'date-time' },
                        read_at: { type: 'string', format: 'date-time', nullable: true },
                        archived_at: { type: 'string', format: 'date-time', nullable: true }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: { type: 'string' }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string' }
                    }
                }
            }
        }
    },
    apis: ['./routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
