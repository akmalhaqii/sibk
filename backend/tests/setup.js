// Tahap 5: tes berjalan offline dan deterministik secara bawaan.
// - PRICE_PROVIDER=off  : tidak memanggil Yahoo Finance
// - USE_OLLAMA=false    : narasi memakai templat (tes LLM memakai chatFn tiruan)
// - TELUSURFIN_TEST=1   : backend/.env tidak menimpa nilai di atas (REV-06, lihat src/config/env.js)
// Jalankan `npm run test:online` untuk perilaku lama (memakai .env/proses saat ini).
process.env.TELUSURFIN_TEST = '1';
process.env.PRICE_PROVIDER ??= 'off';
process.env.USE_OLLAMA ??= 'false';
// Versi prompt selalu bawaan kode saat tes, walau PROMPT_VERSION lama ter-set di environment Windows
delete process.env.PROMPT_VERSION;
