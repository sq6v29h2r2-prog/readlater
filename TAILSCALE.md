# Tailscale Kurulum Rehberi

ReadLater'a telefondan ve ev dışından erişmek için Tailscale VPN kurulumu.

---

## 1. Bilgisayara Tailscale Kur

1. https://tailscale.com/download/windows adresine git
2. "Download Tailscale for Windows" butonuna tıkla
3. İndirilen dosyayı çalıştır ve kur
4. Sistem tepsisindeki Tailscale ikonuna tıkla
5. Google/Microsoft/GitHub hesabıyla giriş yap

---

## 2. Telefona Tailscale Kur

### iOS
- App Store'dan "Tailscale" indir
- Aynı hesapla giriş yap

### Android
- Play Store'dan "Tailscale" indir
- Aynı hesapla giriş yap

---

## 3. ReadLater'a Telefondan Eriş

Her iki cihaz da Tailscale'e bağlandığında:

1. Bilgisayarda PowerShell aç:
   ```powershell
   tailscale ip
   ```
2. Çıkan IP adresini (100.x.x.x) not al
3. Telefonun tarayıcısında aç:
   ```
   http://100.x.x.x
   ```

---

## Avantajlar

- ✅ Ev dışından da erişim (mobil veri ile)
- ✅ Güvenli VPN bağlantısı
- ✅ Port yönlendirme gerekmez
- ✅ Ücretsiz (kişisel kullanım)
