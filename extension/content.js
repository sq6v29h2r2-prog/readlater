// ReadLater Extension — Content Script (Clarity Reader Mode)
// Converts any webpage into a clean reading view

(function () {
    'use strict';

    // Prevent double-injection
    if (window.__readlaterReaderActive) {
        closeReader();
        return;
    }

    const STORAGE_KEY = 'readlater_reader_prefs';

    // Default preferences
    let prefs = {
        theme: 'dark',
        font: 'sans',
        fontSize: 18,
        width: 'normal',
        lineHeight: 1.7
    };

    // Load saved prefs
    function loadPrefs() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                prefs = { ...prefs, ...JSON.parse(saved) };
            }
        } catch (e) { /* ignore */ }
    }

    function savePrefs() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        } catch (e) { /* ignore */ }
    }

    // Parse article using Readability
    function parseArticle() {
        // Clone the document so Readability doesn't modify the live DOM
        const docClone = document.cloneNode(true);
        const reader = new Readability(docClone);
        return reader.parse();
    }

    // Build toolbar HTML
    function buildToolbar() {
        return `
        <div class="readlater-toolbar">
            <div class="readlater-toolbar-left">
                <button class="readlater-btn readlater-btn-close" id="rl-close" title="Okuma modunu kapat">✕ Kapat</button>
                <a class="readlater-btn" id="rl-original" href="${window.location.href}" target="_blank" title="Orijinal sayfayı aç">🔗 Orijinal</a>
            </div>

            <div class="readlater-toolbar-center">
                <!-- Font -->
                <button class="readlater-btn ${prefs.font === 'sans' ? 'active' : ''}" data-font="sans" title="Sans-serif">Aa</button>
                <button class="readlater-btn ${prefs.font === 'serif' ? 'active' : ''}" data-font="serif" title="Serif" style="font-family: Georgia, serif !important;">Aa</button>
                <button class="readlater-btn ${prefs.font === 'mono' ? 'active' : ''}" data-font="mono" title="Mono" style="font-family: monospace !important;">Aa</button>

                <span class="readlater-sep"></span>

                <!-- Size -->
                <button class="readlater-btn" id="rl-size-down" title="Küçült">A−</button>
                <span class="readlater-btn" id="rl-size-display" style="cursor: default !important; min-width: 32px !important; text-align: center !important;">${prefs.fontSize}</span>
                <button class="readlater-btn" id="rl-size-up" title="Büyüt">A+</button>

                <span class="readlater-sep"></span>

                <!-- Width -->
                <button class="readlater-btn ${prefs.width === 'narrow' ? 'active' : ''}" data-width="narrow" title="Dar">S</button>
                <button class="readlater-btn ${prefs.width === 'normal' ? 'active' : ''}" data-width="normal" title="Normal">M</button>
                <button class="readlater-btn ${prefs.width === 'wide' ? 'active' : ''}" data-width="wide" title="Geniş">L</button>

                <span class="readlater-sep"></span>

                <!-- Theme dots -->
                <span class="readlater-theme-dot ${prefs.theme === 'dark' ? 'active' : ''}" data-theme="dark" title="Koyu"></span>
                <span class="readlater-theme-dot ${prefs.theme === 'light' ? 'active' : ''}" data-theme="light" title="Açık"></span>
                <span class="readlater-theme-dot ${prefs.theme === 'sepia' ? 'active' : ''}" data-theme="sepia" title="Sepya"></span>
                <span class="readlater-theme-dot ${prefs.theme === 'black' ? 'active' : ''}" data-theme="black" title="Siyah"></span>
            </div>

            <div class="readlater-toolbar-right">
                <button class="readlater-btn" id="rl-save" title="ReadLater'a kaydet">💾 Kaydet</button>
            </div>
        </div>`;
    }

    // Build article HTML
    function buildArticle(article) {
        const siteName = article.siteName || new URL(window.location.href).hostname;
        const byline = article.byline ? `<span class="readlater-meta-item">✍️ ${escapeHtml(article.byline)}</span>` : '';
        const publishedTime = article.publishedTime
            ? `<span class="readlater-meta-item">📅 ${new Date(article.publishedTime).toLocaleDateString('tr-TR')}</span>`
            : '';

        return `
        <article class="readlater-article width-${prefs.width}" id="rl-article">
            <header class="readlater-header">
                <h1 class="readlater-title">${escapeHtml(article.title)}</h1>
                <div class="readlater-meta">
                    <span class="readlater-meta-item">📰 ${escapeHtml(siteName)}</span>
                    ${byline}
                    ${publishedTime}
                </div>
            </header>
            <div class="readlater-body font-${prefs.font}" id="rl-body" style="--readlater-font-size: ${prefs.fontSize}px; --readlater-line-height: ${prefs.lineHeight};">
                ${article.content}
            </div>
        </article>

        <div class="readlater-scroll-top" id="rl-scroll-top" title="Başa dön">↑</div>
        <div class="readlater-toast" id="rl-toast">✓ Kaydedildi</div>`;
    }

    // Create and inject the reader overlay
    function createReader(article) {
        loadPrefs();

        const overlay = document.createElement('div');
        overlay.className = 'readlater-reader-overlay';
        overlay.id = 'readlater-overlay';
        overlay.setAttribute('data-theme', prefs.theme);
        overlay.innerHTML = buildToolbar() + buildArticle(article);

        // Inject into page
        document.documentElement.appendChild(overlay);
        window.__readlaterReaderActive = true;

        // Prevent background scroll
        document.body.style.overflow = 'hidden';

        // Bind events
        bindEvents(overlay);
    }

    // Show loading state
    function showLoading() {
        loadPrefs();

        const overlay = document.createElement('div');
        overlay.className = 'readlater-reader-overlay';
        overlay.id = 'readlater-overlay';
        overlay.setAttribute('data-theme', prefs.theme);
        overlay.innerHTML = `
        <div class="readlater-toolbar">
            <div class="readlater-toolbar-left">
                <button class="readlater-btn readlater-btn-close" id="rl-close" title="Kapat">✕ Kapat</button>
            </div>
            <div class="readlater-toolbar-center"></div>
            <div class="readlater-toolbar-right"></div>
        </div>
        <div class="readlater-loading">
            <div class="readlater-loading-spinner"></div>
            <span class="readlater-loading-text">Makale okunuyor...</span>
        </div>`;

        document.documentElement.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        // Bind close button
        overlay.querySelector('#rl-close')?.addEventListener('click', closeReader);
    }

    // Show error
    function showError(message) {
        const overlay = document.getElementById('readlater-overlay');
        if (!overlay) return;

        const content = overlay.querySelector('.readlater-loading') || overlay.querySelector('.readlater-error');
        if (content) {
            content.outerHTML = `
            <div class="readlater-error">
                <span class="readlater-error-icon">😔</span>
                <span class="readlater-error-text">${escapeHtml(message)}</span>
                <button class="readlater-btn" onclick="location.reload()" style="margin-top: 12px !important;">🔄 Sayfayı Yenile</button>
            </div>`;
        }
    }

    // Close reader
    function closeReader() {
        const overlay = document.getElementById('readlater-overlay');
        if (overlay) {
            overlay.remove();
        }
        document.body.style.overflow = '';
        window.__readlaterReaderActive = false;
    }

    // Bind all UI events
    function bindEvents(overlay) {
        // Close
        overlay.querySelector('#rl-close')?.addEventListener('click', closeReader);

        // ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeReader();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Font change
        overlay.querySelectorAll('[data-font]').forEach(btn => {
            btn.addEventListener('click', () => {
                prefs.font = btn.dataset.font;
                savePrefs();
                // Update active states
                overlay.querySelectorAll('[data-font]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Update body class
                const body = overlay.querySelector('#rl-body');
                if (body) {
                    body.className = `readlater-body font-${prefs.font}`;
                }
                showToast('Yazı tipi değiştirildi');
            });
        });

        // Font size
        overlay.querySelector('#rl-size-down')?.addEventListener('click', () => {
            if (prefs.fontSize > 12) {
                prefs.fontSize -= 2;
                savePrefs();
                updateFontSize(overlay);
                showToast(`${prefs.fontSize}px`);
            }
        });
        overlay.querySelector('#rl-size-up')?.addEventListener('click', () => {
            if (prefs.fontSize < 32) {
                prefs.fontSize += 2;
                savePrefs();
                updateFontSize(overlay);
                showToast(`${prefs.fontSize}px`);
            }
        });

        // Width
        overlay.querySelectorAll('[data-width]').forEach(btn => {
            btn.addEventListener('click', () => {
                prefs.width = btn.dataset.width;
                savePrefs();
                overlay.querySelectorAll('[data-width]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const article = overlay.querySelector('#rl-article');
                if (article) {
                    article.className = `readlater-article width-${prefs.width}`;
                }
                showToast('Genişlik değiştirildi');
            });
        });

        // Theme
        overlay.querySelectorAll('.readlater-theme-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                prefs.theme = dot.dataset.theme;
                savePrefs();
                overlay.setAttribute('data-theme', prefs.theme);
                overlay.querySelectorAll('.readlater-theme-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                showToast('Tema değiştirildi');
            });
        });

        // Scroll to top
        const scrollTopBtn = overlay.querySelector('#rl-scroll-top');
        overlay.addEventListener('scroll', () => {
            if (overlay.scrollTop > 400) {
                scrollTopBtn?.classList.add('visible');
            } else {
                scrollTopBtn?.classList.remove('visible');
            }
        });
        scrollTopBtn?.addEventListener('click', () => {
            overlay.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Save to ReadLater
        overlay.querySelector('#rl-save')?.addEventListener('click', async () => {
            const saveBtn = overlay.querySelector('#rl-save');
            if (!saveBtn) return;

            saveBtn.textContent = '⏳ Kaydediliyor...';
            saveBtn.style.pointerEvents = 'none';

            try {
                // Send message to background script to save
                const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
                browserAPI.runtime.sendMessage({
                    action: 'save-article',
                    url: window.location.href,
                    html: document.documentElement.outerHTML
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
            } catch (err) {
                saveBtn.textContent = '❌ Hata';
                setTimeout(() => {
                    saveBtn.textContent = '💾 Kaydet';
                    saveBtn.style.pointerEvents = '';
                }, 2000);
            }
        });
    }

    function updateFontSize(overlay) {
        const body = overlay.querySelector('#rl-body');
        const display = overlay.querySelector('#rl-size-display');
        if (body) {
            body.style.setProperty('--readlater-font-size', prefs.fontSize + 'px');
        }
        if (display) {
            display.textContent = prefs.fontSize;
        }
    }

    // Show toast notification
    function showToast(message) {
        const toast = document.querySelector('#rl-toast');
        if (!toast) return;
        toast.textContent = '✓ ' + message;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 1500);
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ====== MAIN EXECUTION ======
    function activate() {
        try {
            showLoading();

            // Parse with Readability (tiny delay for DOM rendering)
            setTimeout(() => {
                try {
                    const article = parseArticle();

                    if (!article || !article.content) {
                        showError('Bu sayfa için içerik çıkarılamadı. Sayfa çok kısa veya desteklenmiyor olabilir.');
                        return;
                    }

                    // Remove loading overlay and create reader
                    const oldOverlay = document.getElementById('readlater-overlay');
                    if (oldOverlay) oldOverlay.remove();

                    createReader(article);

                } catch (err) {
                    console.error('[ReadLater] Parse error:', err);
                    showError('İçerik parse edilemedi: ' + err.message);
                }
            }, 50);

        } catch (err) {
            console.error('[ReadLater] Activation error:', err);
        }
    }

    // Listen for messages from background script
    const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
    browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'toggle-reader') {
            if (window.__readlaterReaderActive) {
                closeReader();
            } else {
                activate();
            }
            sendResponse({ ok: true });
        }
    });
})();
