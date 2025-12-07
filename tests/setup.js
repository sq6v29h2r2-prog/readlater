// tests/setup.js - Jest setup file

// Test ortamı değişkenleri
process.env.NODE_ENV = 'test';
process.env.PORT = '3001'; // Test için farklı port

// Console loglarını test sırasında sustur
if (process.env.SILENT_TESTS === 'true') {
    global.console = {
        ...console,
        log: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    };
}
