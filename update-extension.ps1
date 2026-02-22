# ReadLater Extension — Güncelleme Scripti
# Bu scripti çalıştırınca uzantı otomatik olarak yeniden paketlenir ve Zen Browser'a yüklenir.
# Zen Browser'ı yeniden başlatman yeterli.

$extensionDir = "$PSScriptRoot\extension"
$zipPath = "$PSScriptRoot\ReadLater_Extension_V4.zip"
$xpiPath = "$PSScriptRoot\ReadLater_Extension_V4.xpi"
$zenExtDir = "$env:APPDATA\zen\Profiles\mo5fjyv.Default (release)\extensions"

Write-Host "`n🔧 ReadLater Extension Güncelleniyor...`n" -ForegroundColor Cyan

# 1. Eski dosyaları sil
Remove-Item $zipPath -ErrorAction SilentlyContinue
Remove-Item $xpiPath -ErrorAction SilentlyContinue

# 2. Zip oluştur
$files = @(
    "$extensionDir\manifest.json",
    "$extensionDir\background.js",
    "$extensionDir\reader.html",
    "$extensionDir\reader-page.js",
    "$extensionDir\reader.css",
    "$extensionDir\Readability.js",
    "$extensionDir\content.js",
    "$extensionDir\icon16.png",
    "$extensionDir\icon48.png",
    "$extensionDir\icon128.png"
)

Compress-Archive -Path $files -DestinationPath $zipPath -Force
Copy-Item $zipPath $xpiPath -Force

# 3. Zen Browser profil klasörüne kopyala
New-Item -ItemType Directory -Path $zenExtDir -Force -ErrorAction SilentlyContinue | Out-Null
Copy-Item $xpiPath "$zenExtDir\readlater@local.extension.xpi" -Force

Write-Host "✅ Uzantı güncellendi!" -ForegroundColor Green
Write-Host "📁 $zenExtDir\readlater@local.extension.xpi" -ForegroundColor Gray
Write-Host "`n🔄 Zen Browser'ı yeniden başlat.`n" -ForegroundColor Yellow
