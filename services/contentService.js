// services/contentService.js - İçerik servisi (Refactored - Test edilebilir)

const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

/**
 * URL'den HTML çek
 * @param {string} url - Çekilecek URL
 * @param {number} timeout - Timeout süresi (ms)
 * @returns {Promise<string>} HTML içeriği
 */
async function fetchHtml(url, timeout = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        clearTimeout(timer);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        console.log(`[FETCH] HTML alındı: ${html.length} karakter`);
        return html;

    } catch (error) {
        clearTimeout(timer);

        if (error.name === 'AbortError') {
            throw new Error(`Zaman aşımı: Site ${timeout / 1000} saniye içinde yanıt vermedi`);
        }
        if (error.code === 'ENOTFOUND') {
            throw new Error(`Site bulunamadı: DNS çözümlenemedi`);
        }
        if (error.code === 'ECONNREFUSED') {
            throw new Error(`Bağlantı reddedildi: Sunucu kapalı olabilir`);
        }

        throw error;
    }
}

/**
 * HTML'den makale içeriği çıkar (Readability)
 * @param {string} html - HTML içeriği
 * @param {string} url - Kaynak URL
 * @returns {object} Parsed article
 */
function parseContent(html, url) {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
        throw new Error('İçerik çıkarılamadı - Bu site desteklenmiyor olabilir');
    }

    console.log(`[PARSE] Başlık: ${article.title}`);
    console.log(`[PARSE] İçerik uzunluğu: ${article.content?.length || 0} karakter`);

    return article;
}

/**
 * İçeriği formatla - Gereksiz etiketleri temizle
 * @param {string} html - Ham HTML içeriği
 * @returns {string} Temizlenmiş HTML
 */
function formatContent(html) {
    if (!html) return '';

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Script, style vb. etiketleri kaldır
    doc.querySelectorAll('script, style, noscript, iframe, form').forEach(el => el.remove());

    // Paragrafları kontrol et
    const paragraphs = doc.querySelectorAll('p');

    if (paragraphs.length > 0) {
        return doc.body.innerHTML;
    }

    // Paragraf yoksa, metin içeriğini paragraflara böl
    const text = doc.body.textContent || '';
    return text
        .split(/\n\s*\n/)
        .filter(line => line.trim().length > 0)
        .map(line => `<p>${line.trim()}</p>`)
        .join('\n');
}

/**
 * URL'den makale çek ve parse et
 * @param {string} url - Makale URL'si
 * @returns {Promise<object>} Parsed article data
 */
async function fetchAndParse(url) {
    console.log(`[FETCH] ${url}`);

    const html = await fetchHtml(url);
    const parsed = parseContent(html, url);

    return {
        title: parsed.title || 'Başlıksız',
        content: formatContent(parsed.content),
        excerpt: parsed.excerpt || '',
        author: parsed.byline || '',
        siteName: parsed.siteName || new URL(url).hostname
    };
}

/**
 * Direkt HTML'den parse et (extension'dan gelen)
 * @param {string} html - HTML içeriği
 * @param {string} url - Kaynak URL
 * @returns {object} Parsed article data
 */
function parseHtml(html, url) {
    const parsed = parseContent(html, url);

    return {
        title: parsed.title || 'Başlıksız',
        content: formatContent(parsed.content),
        excerpt: parsed.excerpt || '',
        author: parsed.byline || '',
        siteName: parsed.siteName || new URL(url).hostname
    };
}

module.exports = {
    fetchHtml,
    parseContent,
    formatContent,
    fetchAndParse,
    parseHtml
};
