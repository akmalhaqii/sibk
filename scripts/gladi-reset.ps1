# Gladi demo TelusurFin - langkah 1: matikan semua layanan dan kembalikan ke kondisi awal
# Jalankan dari folder C:\Angrav\SIBK:
#   powershell -ExecutionPolicy Bypass -File scripts\gladi-reset.ps1
# Tambahkan -SimpanCache bila hasil analisis di data\cache tidak ingin dihapus.
param([switch]$SimpanCache)

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent $PSScriptRoot
$ports = @(3001, 3002, 3099, 5173, 11434)

function Show-Ports($judul) {
  Write-Host ""
  Write-Host "== $judul" -ForegroundColor Cyan
  $any = $false
  foreach ($p in $ports) {
    $c = Get-NetTCPConnection -State Listen -LocalPort $p
    if ($c) {
      $any = $true
      $proc = Get-Process -Id ($c | Select-Object -First 1).OwningProcess
      Write-Host ("  port {0,-5} AKTIF  -> {1} (PID {2})" -f $p, $proc.ProcessName, $proc.Id) -ForegroundColor Yellow
    } else {
      Write-Host ("  port {0,-5} mati" -f $p) -ForegroundColor Green
    }
  }
  return $any
}

$adaAktif = Show-Ports "Port sebelum dimatikan (3001/3002 backend, 3099 tes, 5173 frontend, 11434 Ollama)"

Write-Host ""
Write-Host "== Mematikan layanan" -ForegroundColor Cyan
# Node: hanya proses yang memegang port TelusurFin, bukan semua node di laptop
foreach ($p in @(3001, 3002, 3099, 5173)) {
  Get-NetTCPConnection -State Listen -LocalPort $p | ForEach-Object {
    $proc = Get-Process -Id $_.OwningProcess
    if ($proc) {
      Stop-Process -Id $proc.Id -Force
      Write-Host "  dihentikan: $($proc.ProcessName) (PID $($proc.Id)) di port $p"
    }
  }
}
# Ollama: aplikasi tray dan server
foreach ($name in @('ollama app', 'ollama')) {
  Get-Process -Name $name | ForEach-Object {
    Stop-Process -Id $_.Id -Force
    Write-Host "  dihentikan: $($_.ProcessName) (PID $($_.Id))"
  }
}
Start-Sleep -Seconds 2

$masihAktif = Show-Ports "Port setelah dimatikan"

if (-not $SimpanCache) {
  Write-Host ""
  Write-Host "== Membersihkan hasil analisis lama (data\cache)" -ForegroundColor Cyan
  $cache = Join-Path $root 'data\cache'
  $hapus = Get-ChildItem $cache -Filter 'analyze_*.json' | Where-Object { $_.Name -ne 'analyze_SMGR_smgr-demo.json' }
  $hapus | Remove-Item -Force
  Write-Host "  dihapus: $($hapus.Count) berkas. Dipertahankan: analyze_SMGR_smgr-demo.json, demo_SMGR_backup.json"
}

Write-Host ""
Write-Host "== Konfigurasi backend\.env (hanya kunci yang relevan)" -ForegroundColor Cyan
$envFile = Join-Path $root 'backend\.env'
if (Test-Path $envFile) {
  Get-Content $envFile | Where-Object { $_ -match '^(PORT|OLLAMA_URL|OLLAMA_MODEL|OLLAMA_FALLBACK_MODEL|PROMPT_VERSION|PRICE_PROVIDER|USE_OLLAMA)=' } |
    ForEach-Object { Write-Host "  $_" }
  if (-not (Select-String -Path $envFile -Pattern '^PRICE_PROVIDER=off' -Quiet)) {
    Write-Host "  CATATAN: PRICE_PROVIDER belum 'off'. Untuk demo offline tambahkan baris PRICE_PROVIDER=off" -ForegroundColor Yellow
  }
  if (-not (Select-String -Path $envFile -Pattern '^PROMPT_VERSION=narrative_v3' -Quiet)) {
    Write-Host "  CATATAN: PROMPT_VERSION belum narrative_v3" -ForegroundColor Yellow
  }
} else {
  Write-Host "  backend\.env tidak ditemukan" -ForegroundColor Red
}

Write-Host ""
Write-Host "== Koneksi internet" -ForegroundColor Cyan
$net = Test-NetConnection -ComputerName 1.1.1.1 -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($net) { Write-Host "  internet MASIH TERHUBUNG (matikan Wi-Fi bila ingin gladi benar-benar offline)" -ForegroundColor Yellow }
else { Write-Host "  internet terputus (offline)" -ForegroundColor Green }

Write-Host ""
if ($masihAktif) {
  Write-Host "HASIL: masih ada port aktif. Tutup terminal yang menjalankannya lalu ulangi skrip ini." -ForegroundColor Red
} else {
  Write-Host "HASIL: semua layanan TelusurFin dan Ollama sudah mati. Kondisi setara laptop baru dinyalakan." -ForegroundColor Green
  Write-Host "Tutup juga semua tab browser TelusurFin (hasil terakhir tersimpan di sessionStorage tab)."
}
