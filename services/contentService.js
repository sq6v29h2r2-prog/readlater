// services/contentService.js - İçerik servisi (Refactored - Test edilebilir)

const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

/**
 * Başlığı temizle - site adı prefix/suffix'lerini kaldır
 * @param {string} title - Ham başlık
 * @param {string} siteName - Site adı (hostname)
 * @returns {string} Temizlenmiş başlık
 */
function cleanTitle(title, siteName) {
    if (!title) return 'Başlıksız';

    // HTML entity'leri decode et
    let cleanedTitle = title
        .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&#x22;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#38;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#160;/g, ' ');

    // Site adından marka adını çıkar (t24.com.tr -> t24, gazeteoksijen.com -> gazeteoksijen)
    let brandName = siteName.toLowerCase();

    // Yaygın subdomain ve TLD'leri temizle
    brandName = brandName.replace(/^www\./, '')
        .replace(/^m\./, '')
        .replace(/^e\./, '');

    // TLD'yi kaldır (.com.tr, .com, .net, .org vb.)
    const tldRegex = /\.(com\.tr|org\.tr|net\.tr|gov\.tr|edu\.tr|gen\.tr|web\.tr|k12\.tr|com|net|org|io|co|me|biz|info|tv|news|blog|xyz)$/i;
    brandName = brandName.replace(tldRegex, '');

    // Kalan noktaları da temizle (subdomain varsa)
    if (brandName.includes('.')) {
        brandName = brandName.split('.').pop(); // en son parçayı al (örn: blog.google -> google)
    }

    // Site adını içeren yaygın pattern'ları kaldır
    // Regex içinde tire (-) karakterini en başa koyarak range olmasını engelliyoruz
    const separators = '[-|–—:]';

    const sitePatterns = [
        // Tam hostname ile kontrol
        new RegExp(`^${siteName}\\s*${separators}\\s*`, 'i'),
        new RegExp(`\\s*${separators}\\s*${siteName}$`, 'i'),

        // Marka adı ile kontrol (örn: T24)
        new RegExp(`^${brandName}\\s*${separators}\\s*`, 'i'),
        new RegExp(`\\s*${separators}\\s*${brandName}$`, 'i'),

        // Özel durumlar
        /^Aposto\s*\|\s*/i,
        /\s*\|\s*Aposto$/i,
        /^Substack\s*[-|–—:]\s*/i,
        /\s*[-|–—:]\s*Substack$/i,
        /\s*[-|–—:]\s*YouTube$/i,
        /\s*[-|–—:]\s*Medium$/i,
    ];

    for (const pattern of sitePatterns) {
        cleanedTitle = cleanedTitle.replace(pattern, '');
    }

    // Gazete Oksijen gibi özel durumlar (boşluklu site adları)
    if (siteName.includes('gazeteoksijen')) {
        cleanedTitle = cleanedTitle.replace(/\s*[-|–—:]\s*Gazete Oksijen$/i, '')
            .replace(/^Gazete Oksijen\s*[-|–—:]\s*/i, '');
    }

    return cleanedTitle.trim() || title;
}

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
        // URL'den hostname çıkar
        const urlObj = new URL(url);
        const referer = `${urlObj.protocol}//${urlObj.hostname}/`;

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'max-age=0',
                'Connection': 'keep-alive',
                'Referer': referer,
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
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
    const doc = dom.window.document;

    // 1. Next.js __NEXT_DATA__ desteği (Aposto, Substack vb.) - öncelikli
    const nextDataScript = doc.querySelector('script#__NEXT_DATA__');
    if (nextDataScript) {
        try {
            const nextData = JSON.parse(nextDataScript.textContent);
            const pageProps = nextData.props?.pageProps;

            // Aposto story sayfası için (/s/ URL'leri)
            if (pageProps?.story?.body) {
                const story = pageProps.story;
                console.log(`[PARSE] Next.js __NEXT_DATA__ içeriği bulundu (Aposto Story) - ${story.body.length} karakter`);
                return {
                    title: story.title || 'Makale',
                    content: story.body,
                    excerpt: story.subtitle || '',
                    byline: story.author?.name || '',
                    siteName: story.newsletter?.name || new URL(url).hostname
                };
            }

            // Aposto issue sayfası için (/i/ URL'leri) - issue.body + channels[].stories[].body
            if (pageProps?.issue) {
                const issue = pageProps.issue;
                let fullContent = issue.body || '';

                // Channels içindeki tüm stories'leri topla
                if (issue.channels && Array.isArray(issue.channels)) {
                    issue.channels.forEach(channel => {
                        // Sponsorlu içerikleri atla
                        if (channel.isCampaign) return;

                        // Kanal başlığı ekle
                        if (channel.title && channel.stories?.length > 0) {
                            fullContent += `<h2>${channel.title}</h2>`;
                        }

                        // Stories'leri ekle
                        if (channel.stories && Array.isArray(channel.stories)) {
                            channel.stories.forEach(story => {
                                if (story.body) {
                                    fullContent += story.body;
                                }
                            });
                        }
                    });
                }

                if (fullContent.length > 0) {
                    console.log(`[PARSE] Next.js __NEXT_DATA__ içeriği bulundu (Aposto Issue) - ${fullContent.length} karakter`);
                    return {
                        title: issue.title || issue.subject || 'Newsletter',
                        content: fullContent,
                        excerpt: issue.subtitle || issue.description || issue.summary || '',
                        byline: issue.author?.name || '',
                        siteName: issue.newsletter?.name || new URL(url).hostname
                    };
                }
            }

            // Substack için post.body_html
            if (pageProps?.post?.body_html) {
                console.log(`[PARSE] Next.js __NEXT_DATA__ içeriği bulundu (Substack)`);
                return {
                    title: pageProps.post.title || 'Newsletter',
                    content: pageProps.post.body_html,
                    excerpt: pageProps.post.subtitle || pageProps.post.description || '',
                    byline: pageProps.post.publishedBylines?.[0]?.name || '',
                    siteName: pageProps.post.publication?.name || new URL(url).hostname
                };
            }

            // Genel __NEXT_DATA__ article/content
            if (pageProps?.article?.content || pageProps?.content?.body) {
                console.log(`[PARSE] Next.js __NEXT_DATA__ içeriği bulundu (genel)`);
                const content = pageProps.article?.content || pageProps.content?.body;
                return {
                    title: pageProps.article?.title || pageProps.content?.title || 'Makale',
                    content: content,
                    excerpt: pageProps.article?.excerpt || pageProps.content?.excerpt || '',
                    byline: pageProps.article?.author?.name || '',
                    siteName: new URL(url).hostname
                };
            }
        } catch (e) {
            console.log(`[PARSE] __NEXT_DATA__ parse hatası: ${e.message}`);
        }
    }

    // 3. Aposto/Substack gibi siteler için özel işleme (fallback)
    const isNewsletterPlatform =
        url.includes('aposto.com') ||
        url.includes('substack.com') ||
        url.includes('revue.co') ||
        url.includes('buttondown.email');

    if (isNewsletterPlatform) {
        console.log(`[PARSE] Newsletter platform tespit edildi: ${new URL(url).hostname}`);

        // Meta description'dan içerik al
        const ogDescription = doc.querySelector('meta[property="og:description"]')?.content;
        const description = doc.querySelector('meta[name="description"]')?.content;
        const title = doc.querySelector('meta[property="og:title"]')?.content ||
            doc.querySelector('title')?.textContent || 'Newsletter';

        // Sayfa içeriğini topla - article veya main tag'leri
        let content = '';
        const articleEl = doc.querySelector('article') ||
            doc.querySelector('main') ||
            doc.querySelector('.post-content') ||
            doc.querySelector('.available-content') || // Substack
            doc.querySelector('.story-text') ||        // Aposto
            doc.querySelector('.newsletter-body');

        if (articleEl && articleEl.textContent.trim().length > 200) {
            content = articleEl.innerHTML;
        } else if (ogDescription || description) {
            content = `<p>${ogDescription || description}</p>`;
        }

        if (content.length > 100) {
            return {
                title: title,
                content: content,
                excerpt: ogDescription || description || '',
                byline: '',
                siteName: new URL(url).hostname
            };
        }
    }

    // Gazete Oksijen site-specific extraction
    if (url.includes('gazeteoksijen.com')) {
        console.log(`[PARSE] Gazete Oksijen tespit edildi, özel parser kullanılıyor`);

        // Başlığı al - h1 etiketi sayfada tek
        const title = doc.querySelector('h1')?.textContent?.trim() ||
            doc.querySelector('meta[property="og:title"]')?.content ||
            doc.querySelector('title')?.textContent || 'Başlıksız';

        // Ana makale içeriği: #content-detail - bu ID benzersiz ve tam makaleyi içeriyor
        let contentElement = doc.querySelector('#content-detail') ||
            doc.querySelector('article.article__content') ||
            doc.querySelector('article');

        if (contentElement) {
            // İçerikten gereksiz elementleri kaldır
            contentElement.querySelectorAll('script, style, noscript, iframe, .social-share, .share-buttons, .related-news, .sidebar, .ad, [class*="reklam"], [class*="advertisement"], .news__share').forEach(el => el.remove());

            let content = contentElement.innerHTML;

            // En az birkaç paragraf varsa kullan
            if (content.length > 200) {
                console.log(`[PARSE] Gazete Oksijen içeriği bulundu (#content-detail): ${content.length} karakter`);

                // Excerpt oluştur
                const excerpt = contentElement.textContent?.substring(0, 300)?.trim() || '';

                // Yazar bilgisi - genellikle içeriğin başında
                const author = doc.querySelector('.author-name, .byline, [class*="author"]')?.textContent?.trim() || '';

                return {
                    title: cleanTitle(title, 'gazeteoksijen.com'),
                    content: content,
                    excerpt: excerpt,
                    byline: author,
                    siteName: 'Gazete Oksijen'
                };
            }
        }

        console.log(`[PARSE] Gazete Oksijen özel parser başarısız, Readability'ye geçiliyor`);
    }

    // Email/Newsletter tespiti
    const isEmailNewsletter =
        url.includes('emailshow') ||
        url.includes('newsletter') ||
        url.includes('/email/') ||
        url.includes('mailchi.mp') ||
        url.includes('campaign-archive') ||
        doc.querySelector('meta[name="x-mailer"]') ||
        doc.querySelector('table[role="presentation"]') ||
        (doc.querySelectorAll('table').length > 5 && doc.querySelectorAll('article').length === 0);

    // Önce Readability dene
    const reader = new Readability(dom.window.document.cloneNode(true));
    const article = reader.parse();

    // Email/Newsletter için özel işleme
    if (isEmailNewsletter || !article || (article.content && article.content.length < 1000)) {
        console.log(`[PARSE] Email/Newsletter modu aktif`);

        // Body içeriğini al, gereksiz elementleri temizle
        const body = doc.body;
        if (body) {
            // Gereksiz elementleri kaldır
            body.querySelectorAll('script, style, noscript, meta, link, header, footer, nav, .footer, .header, .unsubscribe').forEach(el => el.remove());

            // Tüm metni topla
            let content = body.innerHTML;

            // Başlığı bul - birden fazla kaynaktan dene
            let title = doc.querySelector('meta[property="og:title"]')?.content ||
                doc.querySelector('meta[name="title"]')?.content ||
                doc.querySelector('title')?.textContent ||
                doc.querySelector('h1')?.textContent ||
                doc.querySelector('h2')?.textContent;

            // Başlık hala boş veya generic ise içerikten çıkarmayı dene
            if (!title || title === 'Newsletter' || title.trim() === '' || title.length < 5) {
                // Emoji ile başlayan kalın başlık ara (newsletter'larda yaygın)
                const allStrongs = body.querySelectorAll('strong, b');
                for (const strong of allStrongs) {
                    const text = strong.textContent?.trim() || '';
                    // Emoji ile başlayan veya yeterince uzun başlık
                    if (text.length > 10 && text.length < 150) {
                        // Emoji regex: başta emoji varsa veya anlamlı metin
                        const hasEmoji = /^[\u{1F300}-\u{1F9FF}]|^[\u{2600}-\u{26FF}]/u.test(text);
                        const isGoodTitle = hasEmoji || (text.length > 15 && text.length < 100);
                        if (isGoodTitle) {
                            title = text;
                            break;
                        }
                    }
                }

                // Hala bulunamadıysa diğer yöntemleri dene
                if (!title || title === 'Newsletter' || title.trim() === '') {
                    const firstH1 = body.querySelector('h1');
                    const firstH2 = body.querySelector('h2');
                    const firstStrong = body.querySelector('strong');

                    if (firstH1?.textContent?.trim().length > 5) {
                        title = firstH1.textContent.trim();
                    } else if (firstH2?.textContent?.trim().length > 5) {
                        title = firstH2.textContent.trim();
                    } else if (firstStrong?.textContent?.trim().length > 10 && firstStrong?.textContent?.trim().length < 100) {
                        title = firstStrong.textContent.trim();
                    } else {
                        // İçerikten ilk cümleyi al
                        const textContent = body.textContent?.trim() || '';
                        const firstSentence = textContent.split(/[.!?\n]/).find(s => s.trim().length > 10);
                        if (firstSentence && firstSentence.length < 100) {
                            title = firstSentence.trim();
                        } else {
                            // Hostname'den newsletter adı oluştur
                            const hostname = new URL(url).hostname.replace('e.', '').replace('www.', '');
                            title = `Newsletter - ${hostname}`;
                        }
                    }
                }
            }

            // Site adını belirle
            let siteName = new URL(url).hostname;
            if (siteName.startsWith('e.')) {
                siteName = siteName.substring(2); // e.gazeteoksijen.com -> gazeteoksijen.com
            }

            console.log(`[PARSE] Başlık: ${title}`);
            console.log(`[PARSE] İçerik uzunluğu: ${content.length} karakter (Newsletter modu)`);

            return {
                title: title.trim(),
                content: content,
                excerpt: body.textContent?.substring(0, 300)?.trim() || '',
                byline: '',
                siteName: siteName
            };
        }
    }

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

    // Önce IE/Outlook conditional comments'ları temizle
    html = html.replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '');
    html = html.replace(/<!\[endif\]-->/gi, '');
    html = html.replace(/<!--\[if[^\]]*>/gi, '');
    // HTML yorumlarını temizle
    html = html.replace(/<!--[\s\S]*?-->/g, '');

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Script, style vb. etiketleri kaldır
    doc.querySelectorAll('script, style, noscript, iframe, form, svg, img[width="1"]').forEach(el => el.remove());

    // Email/Newsletter öğelerini kaldır
    doc.querySelectorAll('.preheader, .footer, .unsubscribe, [class*="unsubscribe"]').forEach(el => el.remove());

    // Email newsletter tespiti (çok fazla tablo varsa)
    const tableCount = doc.querySelectorAll('table').length;
    const isEmailFormat = tableCount > 10;

    if (isEmailFormat) {
        // Email formatı için - tüm body'yi al ve temizle
        const body = doc.body.cloneNode(true);

        // Gereksiz elementleri kaldır
        body.querySelectorAll('script, style, noscript, meta, link, head').forEach(el => el.remove());

        // Footer pattern'leri içeren elementleri kaldır
        const footerPatterns = [
            /abonelik/i, /unsubscribe/i, /subscription/i,
            /gizlilik\s*politika/i, /çerez\s*politika/i, /privacy\s*policy/i,
            /bilgilerinizi\s*güncelle/i,
            /\d{4}\s*©/i, /tüm\s*hakları/i, /all\s*rights/i,
            /mahallesi.*sokak.*no/i,
            /teşekkür\s*ederiz.*bülten/i, /bülteni.*okuduğunuz/i,
            /geri\s*bildirim/i, /eposta\s*gönder.*izniniz/i,
            /bu\s*bülten\s*size/i, /bulten@/i,
        ];

        // Footer td'lerini bul ve kaldır
        body.querySelectorAll('td').forEach(td => {
            const text = td.textContent?.trim() || '';
            if (footerPatterns.some(p => p.test(text))) {
                td.innerHTML = '';
            }
        });

        // Spacer/tracking resimleri kaldır
        body.querySelectorAll('img').forEach(img => {
            const src = img.src || '';
            const width = parseInt(img.width) || parseInt(img.getAttribute('width')) || 100;
            if (src.includes('spacer') || src.includes('1x1') || src.includes('pixel') ||
                src.includes('tracking') || src.includes('beacon') || width < 20) {
                img.remove();
            }
        });

        // İçeriği HTML olarak al
        let html = body.innerHTML;

        // Tablo yapısını kaldır, içeriği koru
        html = html
            .replace(/<table[^>]*>/gi, '<div>')
            .replace(/<\/table>/gi, '</div>')
            .replace(/<tbody[^>]*>/gi, '')
            .replace(/<\/tbody>/gi, '')
            .replace(/<tr[^>]*>/gi, '<div>')
            .replace(/<\/tr>/gi, '</div>')
            .replace(/<td[^>]*>/gi, '<div>')
            .replace(/<\/td>/gi, '</div>')
            .replace(/<th[^>]*>/gi, '<div>')
            .replace(/<\/th>/gi, '</div>');

        // Inline style ve gereksiz attribute'ları kaldır
        html = html.replace(/\s*style="[^"]*"/gi, '');
        html = html.replace(/\s*class="[^"]*"/gi, '');
        html = html.replace(/\s*bgcolor="[^"]*"/gi, '');
        html = html.replace(/\s*width="[^"]*"/gi, '');
        html = html.replace(/\s*height="[^"]*"/gi, '');
        html = html.replace(/\s*align="[^"]*"/gi, '');
        html = html.replace(/\s*valign="[^"]*"/gi, '');
        html = html.replace(/\s*cellpadding="[^"]*"/gi, '');
        html = html.replace(/\s*cellspacing="[^"]*"/gi, '');
        html = html.replace(/\s*border="[^"]*"/gi, '');
        html = html.replace(/\s*tabindex="[^"]*"/gi, '');

        // &nbsp; temizle
        html = html.replace(/&nbsp;/g, ' ');

        // Boş div'leri temizle
        html = html.replace(/<div>\s*<\/div>/gi, '');
        html = html.replace(/<div>\s*<div>/gi, '<div>');
        html = html.replace(/<\/div>\s*<\/div>/gi, '</div>');

        // Çoklu boşlukları temizle
        html = html.replace(/\s+/g, ' ');

        // <strong> ve <b> içindeki kısa metinleri h2 yap (başlık olarak)
        const dom2 = new JSDOM(html);
        const doc2 = dom2.window.document;

        doc2.querySelectorAll('strong, b').forEach(el => {
            const text = el.textContent?.trim() || '';
            // Kısa, bağımsız başlık metinleri
            if (text.length > 5 && text.length < 100) {
                const parent = el.parentElement;
                const parentText = parent?.textContent?.trim() || '';
                // Parent'ın içeriği sadece bu strong/b ise başlık yap
                if (Math.abs(parentText.length - text.length) < 20) {
                    const h2 = doc2.createElement('h2');
                    h2.textContent = text;
                    el.replaceWith(h2);
                }
            }
        });

        // Boş elementleri kaldır
        doc2.querySelectorAll('div, span, p').forEach(el => {
            if (el.textContent?.trim() === '' && !el.querySelector('img, a')) {
                el.remove();
            }
        });

        // Sonucu al
        let result = doc2.body.innerHTML;

        // Son temizlik
        result = result
            .replace(/<div>/gi, '<p>')
            .replace(/<\/div>/gi, '</p>')
            .replace(/<p>\s*<p>/gi, '<p>')
            .replace(/<\/p>\s*<\/p>/gi, '</p>')
            .replace(/<p>\s*<\/p>/gi, '')
            .replace(/<p>\s*<h2>/gi, '<h2>')
            .replace(/<\/h2>\s*<\/p>/gi, '</h2>')
            .trim();

        return result;
    }

    // Normal içerik için (email değilse)
    // Tüm elementlerden inline style kaldır
    doc.querySelectorAll('*').forEach(el => {
        const attrsToRemove = ['style', 'bgcolor', 'background', 'width', 'height',
            'align', 'valign', 'cellpadding', 'cellspacing', 'border', 'fr-original-style',
            'class', 'data-stringify-type'];
        attrsToRemove.forEach(attr => el.removeAttribute(attr));
    });

    // Boş elementleri kaldır
    doc.querySelectorAll('p, div, span').forEach(el => {
        if (el.textContent.trim() === '' && !el.querySelector('img, a, h1, h2, h3')) {
            el.remove();
        }
    });

    return doc.body.innerHTML.trim();
}

/**
 * URL'den makale çek ve parse et
 * @param {string} url - Makale URL'si
 * @returns {Promise<object>} Parsed article data
 */
async function fetchAndParse(url) {
    console.log(`[FETCH] ${url}`);

    try {
        // Önce doğrudan siteyi dene
        const html = await fetchHtml(url);
        const parsed = parseContent(html, url);

        // Başlığı temizle (site adı prefix/suffix'lerini kaldır)
        let title = parsed.title || 'Başlıksız';
        title = cleanTitle(title, parsed.siteName || new URL(url).hostname);

        return {
            title: title,
            content: formatContent(parsed.content),
            excerpt: parsed.excerpt || '',
            author: parsed.byline || '',
            siteName: parsed.siteName || new URL(url).hostname
        };
    } catch (error) {
        // 403 Forbidden veya bot koruması hatası
        if (error.message && error.message.includes('403')) {
            console.log(`[FETCH] 403 hatası, alternatif kaynaklar deneniyor...`);

            // 0. AMP versiyonunu dene (T24, Hürriyet vb. siteler için)
            try {
                const urlObj = new URL(url);
                // /amp/ ekle (varsa atla)
                if (!urlObj.pathname.includes('/amp/')) {
                    const ampUrl = url.replace(urlObj.hostname + '/', urlObj.hostname + '/amp/');
                    console.log(`[FETCH] AMP versiyonu deneniyor: ${ampUrl}`);
                    const ampHtml = await fetchHtmlSimple(ampUrl);

                    if (ampHtml && ampHtml.length > 1000) {
                        const parsed = parseContent(ampHtml, url);

                        if (parsed.content && parsed.content.length > 500) {
                            console.log(`[FETCH] AMP versiyonu başarılı!`);
                            return {
                                title: cleanTitle(parsed.title || 'Başlıksız', new URL(url).hostname),
                                content: formatContent(parsed.content),
                                excerpt: parsed.excerpt || '',
                                author: parsed.byline || '',
                                siteName: parsed.siteName || new URL(url).hostname
                            };
                        }
                    }
                }
            } catch (ampError) {
                console.log(`[FETCH] AMP versiyonu başarısız: ${ampError.message}`);
            }

            // 1. Wayback Machine dene (en güvenilir)
            try {
                console.log(`[FETCH] Wayback Machine deneniyor...`);
                const waybackApiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
                const waybackResponse = await fetch(waybackApiUrl, { timeout: 10000 });
                const waybackData = await waybackResponse.json();

                if (waybackData.archived_snapshots?.closest?.url) {
                    const snapshotUrl = waybackData.archived_snapshots.closest.url;
                    console.log(`[FETCH] Wayback snapshot bulundu: ${snapshotUrl}`);
                    const waybackHtml = await fetchHtmlSimple(snapshotUrl);
                    const parsed = parseContent(waybackHtml, url);

                    console.log(`[FETCH] Wayback Machine başarılı!`);
                    return {
                        title: parsed.title || 'Başlıksız',
                        content: formatContent(parsed.content),
                        excerpt: parsed.excerpt || '',
                        author: parsed.byline || '',
                        siteName: parsed.siteName || new URL(url).hostname + ' (Wayback)'
                    };
                }
            } catch (waybackError) {
                console.log(`[FETCH] Wayback Machine başarısız: ${waybackError.message}`);
            }

            // 2. Google Cache dene
            try {
                const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}&strip=1`;
                const cacheHtml = await fetchHtmlSimple(cacheUrl);
                const parsed = parseContent(cacheHtml, url);

                console.log(`[FETCH] Google Cache başarılı!`);
                return {
                    title: parsed.title || 'Başlıksız',
                    content: formatContent(parsed.content),
                    excerpt: parsed.excerpt || '',
                    author: parsed.byline || '',
                    siteName: parsed.siteName || new URL(url).hostname + ' (Cache)'
                };
            } catch (cacheError) {
                console.log(`[FETCH] Google Cache başarısız: ${cacheError.message}`);
            }

            // 3. Archive.today dene (CAPTCHA riski var)
            try {
                console.log(`[FETCH] Archive.today deneniyor...`);
                const archiveSearchUrl = `https://archive.today/newest/${encodeURIComponent(url)}`;
                const archiveHtml = await fetchHtmlSimple(archiveSearchUrl);
                const parsed = parseContent(archiveHtml, url);

                console.log(`[FETCH] Archive.today başarılı!`);
                return {
                    title: parsed.title || 'Başlıksız',
                    content: formatContent(parsed.content),
                    excerpt: parsed.excerpt || '',
                    author: parsed.byline || '',
                    siteName: parsed.siteName || new URL(url).hostname + ' (Archive)'
                };
            } catch (archiveError) {
                console.log(`[FETCH] Archive.today başarısız: ${archiveError.message}`);
            }

            // Hiçbiri çalışmazsa orijinal hatayı fırlat
            throw new Error(`Site erişimi engellendi (403). Lütfen tarayıcı extension'ı ile sayfada sağ tık yaparak kaydedin.`);
        }

        throw error;
    }
}

/**
 * Basit HTML fetch (cache/archive için)
 */
async function fetchHtmlSimple(url, timeout = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            },
            redirect: 'follow'
        });

        clearTimeout(timer);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.text();
    } catch (error) {
        clearTimeout(timer);
        throw error;
    }
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
