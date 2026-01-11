# ReadLater Firewall Fix - YÖNETİCİ OLARAK ÇALIŞTIRIN!

Write-Host "ReadLater Firewall Düzeltmesi" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Eski kuralları sil
Write-Host "`n[1/3] Eski kurallar siliniyor..." -ForegroundColor Yellow
Get-NetFirewallRule -DisplayName "*ReadLater*" -ErrorAction SilentlyContinue | Remove-NetFirewallRule

# Yeni kapsamlı kurallar ekle
Write-Host "[2/3] Yeni kurallar ekleniyor..." -ForegroundColor Yellow

# TCP Port 80 - Tüm profiller, tüm programlar
New-NetFirewallRule -DisplayName "ReadLater HTTP (TCP 80)" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 80 `
    -Action Allow `
    -Profile Any `
    -RemoteAddress Any `
    -Enabled True

# Node.js için özel kural
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if ($nodePath) {
    New-NetFirewallRule -DisplayName "ReadLater Node.js" `
        -Direction Inbound `
        -Program $nodePath `
        -Action Allow `
        -Profile Any `
        -Enabled True
    Write-Host "    Node.js kurali eklendi: $nodePath" -ForegroundColor Green
}

Write-Host "[3/3] Tamamlandi!" -ForegroundColor Green

Write-Host "`n=== Aktif Kurallar ===" -ForegroundColor Cyan
Get-NetFirewallRule -DisplayName "*ReadLater*" | Select-Object DisplayName, Enabled, Action

Write-Host "`nSimdi telefondan http://192.168.1.15 veya http://100.90.99.112 deneyin!"
Write-Host "`nDevam etmek icin bir tusa basin..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
