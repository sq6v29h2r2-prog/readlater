# ReadLater - Custom Domain Setup Script
# Bu scripti YÖNETİCİ olarak çalıştırın!

$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$entry = "127.0.0.1 readlater.local"

Write-Host "ReadLater Custom Domain Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Mevcut içeriği kontrol et
$content = Get-Content $hostsPath -Raw

if ($content -match "readlater\.local") {
    Write-Host "[OK] readlater.local zaten hosts dosyasinda mevcut" -ForegroundColor Green
} else {
    try {
        Add-Content -Path $hostsPath -Value "`n$entry" -Force
        Write-Host "[OK] Eklendi: $entry" -ForegroundColor Green
    } catch {
        Write-Host "[HATA] Yonetici olarak calistirin!" -ForegroundColor Red
        Write-Host "Sag tik > Yonetici olarak calistir" -ForegroundColor Yellow
        exit 1
    }
}

# DNS cache temizle
Write-Host "`nDNS cache temizleniyor..." -ForegroundColor Yellow
ipconfig /flushdns | Out-Null
Write-Host "[OK] DNS cache temizlendi" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Simdi su adresten erisebilirsiniz:" -ForegroundColor White
Write-Host "  http://readlater.local:3000" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nDevam etmek icin bir tusa basin..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
