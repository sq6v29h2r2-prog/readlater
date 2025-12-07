// jest.config.js - Jest configuration

module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'services/**/*.js',
        'repositories/**/*.js',
        'routes/**/*.js',
        'middlewares/**/*.js',
        'utils/**/*.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    verbose: true,
    testTimeout: 10000,
    setupFilesAfterEnv: ['./tests/setup.js']
};
