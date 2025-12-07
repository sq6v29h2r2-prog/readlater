// tests/unit/contentService.test.js - Content Service Unit Tests

const { formatContent, parseContent } = require('../../services/contentService');

describe('ContentService', () => {
    describe('formatContent', () => {
        test('should remove script tags', () => {
            const html = '<p>Test</p><script>alert("xss")</script>';
            const result = formatContent(html);
            expect(result).not.toContain('<script>');
            expect(result).toContain('Test');
        });

        test('should remove style tags', () => {
            const html = '<p>Test</p><style>.hidden{display:none}</style>';
            const result = formatContent(html);
            expect(result).not.toContain('<style>');
        });

        test('should return empty string for null input', () => {
            expect(formatContent(null)).toBe('');
            expect(formatContent(undefined)).toBe('');
            expect(formatContent('')).toBe('');
        });

        test('should keep paragraph tags', () => {
            const html = '<p>Paragraph 1</p><p>Paragraph 2</p>';
            const result = formatContent(html);
            expect(result).toContain('<p>');
        });

        test('should convert plain text to paragraphs', () => {
            const html = '<div>Line 1\n\nLine 2</div>';
            const result = formatContent(html);
            expect(result).toContain('<p>');
        });
    });

    describe('parseContent', () => {
        test('should parse valid HTML article', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <head><title>Test Article</title></head>
                <body>
                    <article>
                        <h1>Test Title</h1>
                        <p>This is the article content. It needs to be long enough for Readability to work properly.</p>
                        <p>Adding more content here to make the article substantial enough for parsing.</p>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                    </article>
                </body>
                </html>
            `;

            const result = parseContent(html, 'https://example.com/article');
            expect(result).toBeDefined();
            expect(result.title).toBeDefined();
        });

        test('should throw error for empty content', () => {
            const html = '<html><body></body></html>';
            expect(() => parseContent(html, 'https://example.com')).toThrow();
        });
    });
});
