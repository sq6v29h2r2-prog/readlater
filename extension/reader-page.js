// ReadLater Extension — Reader Page Script
// Opens in a new tab, receives HTML from background script, parses with Readability

(function () {
    'use strict';

    const STORAGE_KEY = 'readlater_reader_prefs';
    const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

    let prefs = {
        theme: 'dark',
        font: 'sans',
        fontSize: 18,
        width: 'normal',
        lineHeight: 1.8
    };

    const FONTS = {
        sans: "'Segoe UI', system-ui, -apple-system, sans-serif",
        serif: "Georgia, 'Times New Roman', 'Noto Serif', serif",
        mono: "'Cascadia Code', 'Fira Code', Consolas, monospace"
    };

    // Load prefs
    function loadPrefs() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) prefs = { ...prefs, ...JSON.parse(saved) };
        } catch (e) { /* ignore */ }
    }

    function savePrefs() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(message) {
        const toast = document.getElementById('rl-toast');
        if (!toast) return;
        toast.textContent = '✓ ' + message;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 1500);
    }

    function getParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            tabId: parseInt(params.get('tabId')),
            url: params.get('url')
        };
    }

    // Apply styles directly to the body element and all its children
    function applyBodyStyles() {
        const body = document.getElementById('rl-body');
        if (!body) return;

        const fontFamily = FONTS[prefs.font] || FONTS.sans;
        const fontSize = prefs.fontSize + 'px';
        const lineHeight = String(prefs.lineHeight);

        // Apply directly to body
        body.style.fontFamily = fontFamily;
        body.style.fontSize = fontSize;
        body.style.lineHeight = lineHeight;

        // Force on ALL child text elements to override Readability inline styles
        const textElements = body.querySelectorAll('p, li, span, div, td, th, blockquote, a, em, strong, b, i, u, h1, h2, h3, h4, h5, h6, figcaption, cite, dd, dt');
        textElements.forEach(el => {
            el.style.fontFamily = 'inherit';
            el.style.fontSize = 'inherit';
            el.style.lineHeight = 'inherit';
        });
    }

    // Apply width to article
    function applyWidth() {
        const article = document.getElementById('rl-article');
        if (!article) return;
        const widths = { narrow: '580px', normal: '720px', wide: '920px' };
        article.style.maxWidth = widths[prefs.width] || '720px';
    }

    // Render article
    function renderArticle(article, sourceUrl) {
        const contentArea = document.getElementById('rl-content-area');

        const siteName = article.siteName || (() => { try { return new URL(sourceUrl).hostname; } catch (e) { return ''; } })();
        const byline = article.byline ? `<span class="readlater-meta-item">✍️ ${escapeHtml(article.byline)}</span>` : '';
        const publishedTime = article.publishedTime
            ? `<span class="readlater-meta-item">📅 ${new Date(article.publishedTime).toLocaleDateString('tr-TR')}</span>`
            : '';

        contentArea.innerHTML = `
        <article class="readlater-article" id="rl-article">
            <header class="readlater-header">
                <h1 class="readlater-title">${escapeHtml(article.title)}</h1>
                <div class="readlater-meta">
                    <span class="readlater-meta-item">📰 ${escapeHtml(siteName)}</span>
                    ${byline}
                    ${publishedTime}
                </div>
            </header>
            <div class="readlater-body" id="rl-body">
                ${article.content}
            </div>
        </article>`;

        document.title = article.title + ' — ReadLater';

        const origLink = document.getElementById('rl-original');
        if (origLink) origLink.href = sourceUrl;

        // Apply styles after render
        applyBodyStyles();
        applyWidth();
    }

    function showError(message) {
        const contentArea = document.getElementById('rl-content-area');
        contentArea.innerHTML = `
        <div class="readlater-error">
            <span class="readlater-error-icon">😔</span>
            <span class="readlater-error-text">${escapeHtml(message)}</span>
            <button class="readlater-btn" id="rl-retry" style="margin-top: 12px;">🔄 Tekrar Dene</button>
        </div>`;
        document.getElementById('rl-retry')?.addEventListener('click', () => init());
    }

    function applyPrefs() {
        const overlay = document.getElementById('readlater-overlay');
        overlay.setAttribute('data-theme', prefs.theme);

        // Font buttons
        document.querySelectorAll('[data-font]').forEach(b => {
            b.classList.toggle('active', b.dataset.font === prefs.font);
        });
        // Width buttons
        document.querySelectorAll('[data-width]').forEach(b => {
            b.classList.toggle('active', b.dataset.width === prefs.width);
        });
        // Theme dots
        document.querySelectorAll('.readlater-theme-dot').forEach(d => {
            d.classList.toggle('active', d.dataset.theme === prefs.theme);
        });
        // Size display
        const sizeDisplay = document.getElementById('rl-size-display');
        if (sizeDisplay) sizeDisplay.textContent = prefs.fontSize;
    }

    function bindEvents() {
        const overlay = document.getElementById('readlater-overlay');
        const { url } = getParams();

        // Back button
        document.getElementById('rl-back')?.addEventListener('click', () => window.close());

        // Font
        document.querySelectorAll('[data-font]').forEach(btn => {
            btn.addEventListener('click', () => {
                prefs.font = btn.dataset.font;
                savePrefs();
                document.querySelectorAll('[data-font]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyBodyStyles();
                showToast('Yazı tipi değiştirildi');
            });
        });

        // Size down
        document.getElementById('rl-size-down')?.addEventListener('click', () => {
            if (prefs.fontSize > 12) {
                prefs.fontSize -= 2;
                savePrefs();
                applyBodyStyles();
                document.getElementById('rl-size-display').textContent = prefs.fontSize;
                showToast(prefs.fontSize + 'px');
            }
        });

        // Size up
        document.getElementById('rl-size-up')?.addEventListener('click', () => {
            if (prefs.fontSize < 32) {
                prefs.fontSize += 2;
                savePrefs();
                applyBodyStyles();
                document.getElementById('rl-size-display').textContent = prefs.fontSize;
                showToast(prefs.fontSize + 'px');
            }
        });

        // Width
        document.querySelectorAll('[data-width]').forEach(btn => {
            btn.addEventListener('click', () => {
                prefs.width = btn.dataset.width;
                savePrefs();
                document.querySelectorAll('[data-width]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyWidth();
                showToast('Genişlik değiştirildi');
            });
        });

        // Theme
        document.querySelectorAll('.readlater-theme-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                prefs.theme = dot.dataset.theme;
                savePrefs();
                overlay.setAttribute('data-theme', prefs.theme);
                document.querySelectorAll('.readlater-theme-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                showToast('Tema değiştirildi');
            });
        });

        // Scroll to top
        const scrollTopBtn = document.getElementById('rl-scroll-top');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) scrollTopBtn?.classList.add('visible');
            else scrollTopBtn?.classList.remove('visible');
        });
        scrollTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

        // Save
        document.getElementById('rl-save')?.addEventListener('click', () => {
            const saveBtn = document.getElementById('rl-save');
            saveBtn.textContent = '⏳ Kaydediliyor...';
            saveBtn.style.pointerEvents = 'none';

            browserAPI.runtime.sendMessage({
                action: 'save-article-url',
                url: url
            }, (response) => {
                if (response && response.success) {
                    saveBtn.textContent = '✅ Kaydedildi!';
                    showToast('Makale kaydedildi!');
                } else if (response && response.exists) {
                    saveBtn.textContent = 'ℹ️ Zaten kayıtlı';
                    showToast('Bu makale zaten kayıtlı');
                } else {
                    saveBtn.textContent = '❌ Hata';
                    showToast('Kaydetme hatası');
                }
                setTimeout(() => {
                    saveBtn.textContent = '💾 Kaydet';
                    saveBtn.style.pointerEvents = '';
                }, 2000);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') window.close();
        });
    }

    async function init() {
        loadPrefs();
        applyPrefs();
        bindEvents();

        const { tabId, url } = getParams();

        if (!tabId || !url) {
            showError('Geçersiz sayfa bilgisi');
            return;
        }

        browserAPI.runtime.sendMessage({ action: 'get-page-html', tabId, url }, (response) => {
            if (!response || !response.html) {
                showError('Sayfa içeriği alınamadı. Sayfa yüklenmiş olmalı.');
                return;
            }

            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(response.html, 'text/html');

                const base = doc.createElement('base');
                base.href = url;
                doc.head.insertBefore(base, doc.head.firstChild);

                // Pre-clean known bad elements (cookie banners, etc.) that trick Readability
                const badSelectors = [
                    '[id*="cookie"]', '[class*="cookie"]',
                    '[id*="gdpr"]', '[class*="gdpr"]',
                    '.cookie-banner', '#cookie-banner',
                    '.cookie-consent', '#cookie-consent',
                    '#cookieTextLayer', '.cookie-text', // Sporx specific
                    '.fc-consent-root', // Funding choices (Google)
                    '.cmp-container', '#cmp-container' // Common consent management platforms
                ];
                badSelectors.forEach(selector => {
                    doc.querySelectorAll(selector).forEach(el => el.remove());
                });

                // Also remove full-screen overlays with extreme z-index that might trap readability
                doc.querySelectorAll('div').forEach(div => {
                    const zIndex = parseInt(div.style.zIndex || '0', 10);
                    if (zIndex > 10000 || div.id.startsWith('TR-')) {
                        div.remove();
                    }
                });

                const reader = new Readability(doc, { charThreshold: 50 });
                const article = reader.parse();

                if (!article || !article.content) {
                    showError('Bu sayfa için içerik çıkarılamadı.');
                    return;
                }

                renderArticle(article, url);
            } catch (parseErr) {
                console.error('[ReadLater] Parse error:', parseErr);
                showError('İçerik parse edilemedi: ' + parseErr.message);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
