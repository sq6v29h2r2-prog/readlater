# ReadLater Extension - Kalıcı Kurulum Kılavuzu

Zen Browser'da ReadLater extension'ını **kalıcı olarak** yüklemek için aşağıdaki adımları izleyin.

---

## Yöntem 1: Policies.json ile Kurulum (Önerilen)

### Adım 1: Zen Browser Kurulum Klasörünü Bulun

Genellikle şu konumda:
```
C:\Program Files\Zen Browser\
```

### Adım 2: distribution klasörü oluşturun

```powershell
# PowerShell'de (Yönetici olarak çalıştırın)
New-Item -Path "C:\Program Files\Zen Browser\distribution" -ItemType Directory -Force
```

### Adım 3: policies.json dosyasını kopyalayın

```powershell
# PowerShell'de (Yönetici olarak çalıştırın)
Copy-Item "C:\Users\Yiğit\.gemini\antigravity\scratch\ReadLater\policies.json" -Destination "C:\Program Files\Zen Browser\distribution\policies.json"
```

### Adım 4: Zen Browser'ı yeniden başlatın

Tarayıcıyı tamamen kapatıp tekrar açın. Extension otomatik olarak yüklenecektir.

---

## Yöntem 2: about:config ile Kurulum

1. Zen Browser'da `about:config` yazın
2. Uyarıyı kabul edin
3. Şunu arayın: `xpinstall.signatures.required`
4. Değeri `false` yapın
5. `about:addons` → ⚙️ → "Dosyadan Eklenti Yükle"
6. `ReadLater_Extension_V3.zip` dosyasını seçin

> ⚠️ **Not:** Bu yöntem Zen Browser'ın bazı sürümlerinde çalışmayabilir.

---

## Dosya Konumları

| Dosya | Konum |
|-------|-------|
| Extension ZIP | `C:\Users\Yiğit\.gemini\antigravity\scratch\ReadLater\ReadLater_Extension_V3.zip` |
| policies.json | `C:\Users\Yiğit\.gemini\antigravity\scratch\ReadLater\policies.json` |

---

## Sorun Giderme

**Extension yüklenmiyor:**
- Zen Browser'ın tam olarak kapatıldığından emin olun
- `distribution` klasörünün doğru yerde olduğunu kontrol edin
- policies.json dosyasının geçerli JSON olduğunu doğrulayın

**"İmza doğrulanamadı" hatası:**
- Firefox ESR veya Developer Edition gerekebilir
- about:config'de `xpinstall.signatures.required = false` deneyin
