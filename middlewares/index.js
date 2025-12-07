// middlewares/index.js - Tüm middleware'lerin export edildiği ana dosya

const cors = require('./cors');
const { rateLimiter } = require('./rateLimiter');
const { apiKeyAuth } = require('./auth');
const { asyncHandler, errorHandler, ValidationError, NotFoundError } = require('./errorHandler');
const { validate, schemas } = require('./validate');

module.exports = {
    cors,
    rateLimiter,
    apiKeyAuth,
    asyncHandler,
    errorHandler,
    ValidationError,
    NotFoundError,
    validate,
    schemas
};
