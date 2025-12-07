// ReadLater Extension - Background Script
// Sağ tık menüsü ile kaydetme

const SERVER_URL = 'http://localhost:3000';

// Sağ tık menüsü oluştur
browser.contextMenus.create({
    id: 'save-to-readlater',
    title: '📚 ReadLater\'a Kaydet',
    contexts: ['page', 'link']
});

// Menü tıklaması
browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== 'save-to-readlater') return;

    // Link veya sayfa URL'si
    const url = info.linkUrl || info.pageUrl || tab.url;

    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        showNotification('Hata', 'Geçersiz URL');
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Kaydedildi! ✅', data.article?.title || url);
        } else {
            showNotification('Hata ❌', data.error);
        }

    } catch (error) {
        showNotification('Bağlantı Hatası', 'Sunucuya bağlanılamadı');
    }
});

// Bildirim göster
function showNotification(title, message) {
    browser.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: title,
        message: message
    });
}
