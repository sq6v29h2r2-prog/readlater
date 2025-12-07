# ReadLater

Basit ve güvenilir "Read It Later" uygulaması.

## Özellikler

- 📚 Makale kaydetme ve okuma
- 🎨 4 tema (Siyah, Gri, Sepya, Beyaz)
- 🖍️ Highlight (vurgulama)
- 📝 Not ekleme
- 🔐 Güvenlik (Rate limiting, API key, Helmet)
- 📖 API dokümantasyonu (Swagger)

## Kurulum

```bash
npm install
npm start
```

## API

- `GET /api/articles` - Tüm makaleler
- `POST /api/save` - Makale kaydet
- `GET /api/article/:id` - Makale detay
- `DELETE /api/article/:id` - Makale sil

## Dökümantasyon

http://localhost:3000/api-docs

## Ortam Değişkenleri

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| PORT | Sunucu portu | 3000 |
| NODE_ENV | Ortam | development |
| READLATER_API_KEY | API anahtarı | readlater-secret-key-2024 |

## Lisans

MIT
