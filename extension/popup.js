// ReadLater Extension - Popup Script v3.0
// Manifest V3 uyumlu - Scripting API

const SERVER_URL = 'http://localhost:3000';

// Browser API uyumluluk (Firefox/Chrome)
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let currentUrl = '';
let currentTabId = null;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    const statusEl = document.getElementById('status');
    const saveBtn = document.getElementById('saveBtn');
    const urlDisplay = document.getElementById('urlDisplay');

    try {
        const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });

        if (tabs.length === 0) {
            throw new Error('Aktif sekme bulunamadı');
        }

        currentUrl = tabs[0].url;
        currentTabId = tabs[0].id;

        urlDisplay.textContent = currentUrl;

        if (!currentUrl.startsWith('http://') && !currentUrl.startsWith('https://')) {
            statusEl.textContent = 'Bu sayfa kaydedilemez';
            statusEl.className = 'status error';
            return;
        }

        statusEl.textContent = 'Kaydetmeye hazır';
        statusEl.className = 'status';
        saveBtn.disabled = false;

    } catch (error) {
        statusEl.textContent = 'Hata: ' + error.message;
        statusEl.className = 'status error';
    }
});

// Kaydet butonu
document.getElementById('saveBtn').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    const saveBtn = document.getElementById('saveBtn');

    if (!currentUrl || !currentTabId) return;

    statusEl.textContent = 'Sayfa içeriği alınıyor...';
    statusEl.className = 'status loading';
    saveBtn.disabled = true;

    try {
        // Aktif sekmeden HTML al - Manifest V3 scripting API
        let html = '';

        try {
            const results = await browserAPI.scripting.executeScript({
                target: { tabId: currentTabId },
                func: () => document.documentElement.outerHTML
            });

            if (results && results.length > 0 && results[0].result) {
                html = results[0].result;
                console.log('HTML alındı:', html.length, 'karakter');
            }
        } catch (scriptError) {
            console.error('ExecuteScript hatası:', scriptError);
            // Script çalışmazsa, sadece URL gönder (fallback)
            statusEl.textContent = 'URL modunda kaydediliyor...';
        }

        statusEl.textContent = 'Sunucuya gönderiliyor...';

        // HTML varsa yeni endpoint, yoksa eski endpoint
        const endpoint = html ? '/api/save-with-content' : '/api/save';
        const body = html ? { url: currentUrl, html: html } : { url: currentUrl };

        const response = await fetch(`${SERVER_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.success) {
            statusEl.textContent = '✅ ' + (data.article?.title || 'Kaydedildi!');
            statusEl.className = 'status success';
            showNotification('Kaydedildi! ✅', data.article?.title || 'Makale başarıyla eklendi');
        } else if (data.exists) {
            statusEl.textContent = 'ℹ️ Zaten kayıtlı';
            statusEl.className = 'status info';
            showNotification('Zaten Kayıtlı', data.article?.title || 'Bu makale zaten listenizde');
        } else {
            statusEl.textContent = '❌ ' + data.error;
            statusEl.className = 'status error';
            showNotification('Hata ❌', data.error);
            saveBtn.disabled = false;
        }

    } catch (error) {
        console.error('Genel hata:', error);
        if (error.message.includes('Failed to fetch')) {
            statusEl.textContent = '❌ Sunucuya bağlanılamadı';
        } else {
            statusEl.textContent = '❌ ' + error.message;
        }
        statusEl.className = 'status error';
        saveBtn.disabled = false;
    }
});

// Bildirim göster
function showNotification(title, message) {
    browserAPI.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: title,
        message: message
    });
}
