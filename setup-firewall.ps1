# ReadLater Firewall Rule - YÖNETİCİ OLARAK ÇALIŞTIRIN!

Write-Host "ReadLater Firewall Kurulumu" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

try {
    # Port 80 için kural ekle
    New-NetFirewallRule -DisplayName "ReadLater Port 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Any
    Write-Host "[OK] Firewall kurali eklendi: Port 80" -ForegroundColor Green
}
catch {
    Write-Host "[HATA] Yonetici olarak calistirin!" -ForegroundColor Red
}

Write-Host "`nTamamlandi! Simdi telefondan http://100.90.99.112 adresini deneyin."
Write-Host "`nDevam etmek icin bir tusa basin..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
