# Gladi demo TelusurFin - langkah 3: cek kesiapan setelah Ollama, backend, dan frontend dinyalakan
#   powershell -ExecutionPolicy Bypass -File scripts\gladi-cek.ps1
$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent $PSScriptRoot
$ok = $true

function Line($label, $pass, $detail) {
  if ($pass) { Write-Host ("  [OK]    {0,-26} {1}" -f $label, $detail) -ForegroundColor Green }
  else { Write-Host ("  [GAGAL] {0,-26} {1}" -f $label, $detail) -ForegroundColor Red; $script:ok = $false }
}

$envFile = Join-Path $root 'backend\.env'
$cfg = @{}
Get-Content $envFile | Where-Object { $_ -match '^[A-Z_]+=' } | ForEach-Object {
  $k, $v = $_ -split '=', 2; $cfg[$k] = $v
}
$port = if ($cfg.PORT) { $cfg.PORT } else { '3001' }
$model = if ($cfg.OLLAMA_MODEL) { $cfg.OLLAMA_MODEL } else { 'qwen3:4b' }

Write-Host "== Layanan" -ForegroundColor Cyan
$tags = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 3
Line 'Ollama (11434)' ($null -ne $tags) $(if ($tags) { 'jalan' } else { 'mati: buka Ollama dari menu Start' })
$hasModel = $tags.models.name -contains $model
Line "Model $model" $hasModel $(if ($hasModel) { 'terunduh' } else { 'tidak ada: ubah OLLAMA_MODEL atau ollama pull' })

$health = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 3
Line "Backend ($port)" ($health.server -eq 'ok') $(if ($health) { "server=$($health.server) ollama=$($health.ollama)" } else { 'mati: cd backend; npm start' })
Line 'Backend -> Ollama' ($health.ollama -eq 'ok') $(if ($health.ollama -eq 'ok') { 'tersambung' } else { 'narasi akan jatuh ke templat' })

$fe = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 3
Line 'Frontend (5173)' ($fe.StatusCode -eq 200) $(if ($fe) { 'jalan' } else { 'mati: cd frontend; npm run dev' })
$px = Invoke-RestMethod -Uri 'http://127.0.0.1:5173/api/health' -TimeoutSec 3
Line 'Frontend -> backend' ($px.server -eq 'ok') $(if ($px) { 'proxy tersambung' } else { 'cek VITE_API_TARGET di frontend\.env' })

Write-Host ""
Write-Host "== Konfigurasi" -ForegroundColor Cyan
Line 'PROMPT_VERSION' ($cfg.PROMPT_VERSION -eq 'narrative_v3') "$($cfg.PROMPT_VERSION)"
Line 'OLLAMA_URL' ($cfg.OLLAMA_URL -like '*127.0.0.1*') "$($cfg.OLLAMA_URL)"
$pp = if ($cfg.PRICE_PROVIDER) { $cfg.PRICE_PROVIDER } else { 'yahoo (bawaan)' }
Write-Host "  [INFO]  PRICE_PROVIDER             $pp  (off = demo offline, isi harga manual)"

$net = Test-NetConnection -ComputerName 1.1.1.1 -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue
Write-Host ("  [INFO]  Internet                   {0}" -f $(if ($net) { 'terhubung' } else { 'offline' }))

if ($tags -and $hasModel) {
  Write-Host ""
  Write-Host "== Pemanasan Qwen (memuat model ke memori)" -ForegroundColor Cyan
  $body = @{ model = $model; prompt = 'Balas satu kata: siap'; stream = $false; think = $false; keep_alive = '30m' } | ConvertTo-Json
  $t = Measure-Command { $r = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:11434/api/generate' -ContentType 'application/json' -Body $body -TimeoutSec 120 }
  Line 'Qwen menjawab' ($null -ne $r.response) ("{0:N1} detik: {1}" -f $t.TotalSeconds, ($r.response -replace '\s+', ' ').Trim())
}

Write-Host ""
if ($ok) { Write-Host "SIAP DEMO: buka http://localhost:5173" -ForegroundColor Green }
else { Write-Host "BELUM SIAP: perbaiki baris [GAGAL] di atas, lalu jalankan skrip ini lagi." -ForegroundColor Red }
