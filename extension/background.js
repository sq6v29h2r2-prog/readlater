// ReadLater Extension - Background Script (Manifest V3)
// Sağ tık menüsü ile kaydetme (HTML içerik destekli)

const SERVER_URL = 'http://localhost:3000';

// Browser API uyumluluk (Firefox/Chrome)
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Extension yüklendiğinde menü oluştur
browserAPI.runtime.onInstalled.addListener(() => {
    browserAPI.contextMenus.create({
        id: 'save-to-readlater',
        title: '📚 ReadLater\'a Kaydet',
        contexts: ['page', 'link']
    });
});

// Menü tıklaması
browserAPI.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== 'save-to-readlater') return;

    // Link veya sayfa URL'si
    const url = info.linkUrl || info.pageUrl || tab.url;

    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        showNotification('Hata', 'Geçersiz URL');
        return;
    }

    // Eğer sayfa üzerindeyse (link değil), HTML içeriği al
    if (!info.linkUrl && tab && tab.id) {
        try {
            // Manifest V3 - scripting API kullan
            const results = await browserAPI.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => document.documentElement.outerHTML
            });

            const html = results && results[0] && results[0].result;

            if (html && html.length > 500) {
                // Sayfa HTML'i ile kaydet (sunucu tarafında parsing)
                await saveWithContent(url, html);
                return;
            }
        } catch (e) {
            console.log('[ReadLater] HTML alınamadı, URL ile kaydet:', e.message);
        }
    }

    // Link tıklandıysa veya HTML alınamadıysa sadece URL ile kaydet
    await saveWithUrl(url);
});

// Ortak API çağrı fonksiyonu
async function makeRequest(endpoint, body, fallbackTitle) {
    try {
        const response = await fetch(`${SERVER_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Kaydedildi! ✅', data.article?.title || fallbackTitle);
        } else if (data.exists) {
            showNotification('Zaten Kayıtlı', data.article?.title || fallbackTitle);
        } else {
            showNotification('Hata ❌', data.error);
        }
    } catch (error) {
        showNotification('Bağlantı Hatası', 'Sunucuya bağlanılamadı');
    }
}

// URL ile kaydet
async function saveWithUrl(url) {
    await makeRequest('/api/save', { url }, url);
}

// HTML içerik ile kaydet (Cloudflare korumalı siteler için)
async function saveWithContent(url, html) {
    await makeRequest('/api/save-with-content', { url, html }, url);
}

// Bildirim göster
function showNotification(title, message) {
    browserAPI.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: title,
        message: message
    });
}
