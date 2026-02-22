// ReadLater Extension — Background Script (Manifest V3)
// Icon click → Opens reader in new tab | Sağ tık → Kaydet / Oku

const SERVER_URL = 'http://localhost:3000';
const API_KEY = 'xwUa/mDxr1sqaRVcChh7+oYGM/CX8pxM8ljVtZlsaKo=';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// ====== ICON CLICK → OPEN READER IN NEW TAB ======
browserAPI.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url) {
        showNotification('Hata', 'Aktif sekme bulunamadı');
        return;
    }

    // http/https sayfalarında: HTML al ve reader aç
    if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
        const readerUrl = browserAPI.runtime.getURL(
            `reader.html?tabId=${tab.id}&url=${encodeURIComponent(tab.url)}`
        );
        browserAPI.tabs.create({ url: readerUrl });
    } else {
        showNotification('Bilgi', 'Bu sayfa için okuma modu kullanılamaz. Bir web sayfasına gidin.');
    }
});

// ====== MESSAGE HANDLERS ======
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // Reader page requests HTML from source tab
    if (message.action === 'get-page-html') {
        const { tabId, url } = message;

        browserAPI.scripting.executeScript({
            target: { tabId: tabId },
            func: () => document.documentElement.outerHTML
        }).then(results => {
            const html = results && results[0] && results[0].result;
            sendResponse({ html: html || null });
        }).catch(err => {
            console.error('[ReadLater] HTML alınamadı:', err);
            sendResponse({ html: null, error: err.message });
        });

        return true; // async response
    }

    // Save article by URL (from reader page)
    if (message.action === 'save-article-url') {
        makeRequest('/api/save', { url: message.url }, message.url)
            .then(result => sendResponse(result))
            .catch(() => sendResponse({ success: false }));
        return true;
    }

    // Save article with HTML content (from content script)
    if (message.action === 'save-article') {
        const { url, html } = message;
        const endpoint = html && html.length > 500 ? '/api/save-with-content' : '/api/save';
        const body = html && html.length > 500 ? { url, html } : { url };

        makeRequest(endpoint, body, url)
            .then(result => sendResponse(result))
            .catch(() => sendResponse({ success: false }));
        return true;
    }
});

// ====== CONTEXT MENU ======
browserAPI.runtime.onInstalled.addListener(() => {
    browserAPI.contextMenus.create({
        id: 'save-to-readlater',
        title: '💾 ReadLater\'a Kaydet',
        contexts: ['page', 'link']
    });
    browserAPI.contextMenus.create({
        id: 'open-reader-mode',
        title: '📖 Okuma Modunda Aç',
        contexts: ['page']
    });
});

browserAPI.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'open-reader-mode') {
        if (!tab || !tab.id || !tab.url) return;
        if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
            const readerUrl = browserAPI.runtime.getURL(
                `reader.html?tabId=${tab.id}&url=${encodeURIComponent(tab.url)}`
            );
            browserAPI.tabs.create({ url: readerUrl });
        } else {
            showNotification('Bilgi', 'Bu sayfa için okuma modu kullanılamaz');
        }
        return;
    }

    if (info.menuItemId !== 'save-to-readlater') return;

    const url = info.linkUrl || info.pageUrl || tab.url;
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        showNotification('Hata', 'Geçersiz URL');
        return;
    }

    // Sayfa üzerindeyse HTML al
    if (!info.linkUrl && tab && tab.id) {
        try {
            const results = await browserAPI.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => document.documentElement.outerHTML
            });
            const html = results && results[0] && results[0].result;
            if (html && html.length > 500) {
                await saveWithContent(url, html);
                return;
            }
        } catch (e) {
            console.log('[ReadLater] HTML alınamadı, URL ile kaydet:', e.message);
        }
    }

    await saveWithUrl(url);
});

// ====== API FUNCTIONS ======
async function makeRequest(endpoint, body, fallbackTitle) {
    try {
        const response = await fetch(`${SERVER_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
            body: JSON.stringify(body)
        });
        const data = await response.json();

        if (data.success) {
            showNotification('Kaydedildi! ✅', data.article?.title || fallbackTitle);
            return { success: true, article: data.article };
        } else if (data.exists) {
            showNotification('Zaten Kayıtlı', data.article?.title || fallbackTitle);
            return { exists: true, article: data.article };
        } else {
            showNotification('Hata ❌', data.error);
            return { success: false, error: data.error };
        }
    } catch (error) {
        showNotification('Bağlantı Hatası', 'Sunucuya bağlanılamadı');
        return { success: false, error: 'Bağlantı hatası' };
    }
}

async function saveWithUrl(url) { return await makeRequest('/api/save', { url }, url); }
async function saveWithContent(url, html) { return await makeRequest('/api/save-with-content', { url, html }, url); }

function showNotification(title, message) {
    browserAPI.notifications.create({
        type: 'basic', iconUrl: 'icon48.png', title: title, message: message || ''
    });
}
