---
language:
- id
license: apache-2.0
task_categories:
- question-answering
- text-generation
pretty_name: TelusurFin-QA
size_categories:
- 1K<n<10K
tags:
- finance
- accounting
- indonesian
- financial-statements
---

# TelusurFin-QA

Dataset tanya-jawab keuangan berbahasa Indonesia untuk fine-tuning model "Qwen Finance" pada mode **Tanya bebas keuangan** di TelusurFin. Formatnya sama dengan dataset percakapan Hugging Face pada umumnya: satu kolom `messages` berisi pasangan `user` dan `assistant`.

- **Total:** 10.000 pasang (9.000 latih, 1.000 holdout)
- **Seed:** 20261113. Hasilnya bisa dibuat ulang persis sama dengan generator di folder ini.
- **Dibuat:** 13 November 2026

## Isi

| Kategori | Latih | Holdout | Isi |
| --- | --- | --- | --- |
| `data` | 6.120 | 680 | Soal penalaran dari data laporan keuangan BEI Q1 2025 (401 emiten non-keuangan) yang **disamarkan**. Nama perusahaan fiktif, angka diskalakan dan diberi derau. Jawaban dihitung kode backend TelusurFin. |
| `concept` | 1.350 | 150 | 101 konsep (laporan keuangan, arus kas, PSAK, rasio, valuasi, pasar modal, literasi keuangan, metodologi TelusurFin), ditulis ulang dengan kata-kata sendiri |
| `glossary` | 900 | 100 | 23 istilah kamus TelusurFin (`backend/config/glossary.json`) ditanyakan dengan berbagai cara, ditambah 10 pasang perbandingan istilah |
| `refusal` | 630 | 70 | Penolakan saran investasi, angka emiten tertentu dari ingatan, praktik ilegal (manipulasi, orang dalam, investasi bodong), dan pertanyaan di luar topik |

### Jenis soal `data`

| Tugas | Latih | Holdout | Contoh |
| --- | --- | --- | --- |
| `summary` | 905 | 87 | Ringkasan eksekutif satu paragraf dari tabel rasio (gaya narasi v6). Setiap kalimat lolos pemeriksa narasi aplikasi. |
| `roe`, `roa` | 1.027 | 103 | Rata-rata saldo, laba disetahunkan (Q1 × 4, semester × 2, 9 bulan × 4/3, tahunan × 1), status |
| `net_margin`, `current_ratio`, `der`, `liability_to_asset` | 1.555 | 192 | Perhitungan rasio + status ambang TelusurFin + arti |
| `revenue_growth`, `earnings_growth`, `cash_conversion` | 1.014 | 112 | Termasuk kasus pembanding negatif atau rugi, yaitu saat rasio tidak bermakna |
| `valuation` | 352 | 50 | EPS, BVPS, PER, PBV, nilai wajar Graham, premium/diskon |
| `balance_check` | 348 | 37 | Persamaan neraca, sebagian dengan dana syirkah temporer dan sebagian sengaja tidak seimbang |
| `compare` | 288 | 30 | Membandingkan dua perusahaan pada satu rasio, dengan catatan konteks sektor |
| `status` | 257 | 27 | Menentukan status dari nilai rasio dan menjelaskan ambangnya |
| `units` | 189 | 25 | Membaca satuan "dalam jutaan/ribuan Rupiah" |
| `honesty` | 148 | 16 | Menolak menebak data yang tidak ada (tren 5 tahun, dividen, proyeksi, harga hari ini) |
| `loss` | 37 | 1 | Membaca rasio saat perusahaan merugi |

### Panjang teks (karakter)

| | Min | Median | Maks |
| --- | --- | --- | --- |
| Pertanyaan | 4 | 116 | 528 |
| Jawaban | 61 | 295 | 722 |

## Format

```json
{
  "id": "tfqa-t-data-00012",
  "category": "data",
  "task": "roe",
  "messages": [
    {"role": "user", "content": "Data PT Lintangsari Industri Tbk (kuartal I 2025, dalam juta Rupiah): ..."},
    {"role": "assistant", "content": "Rata-rata ekuitas pemilik entitas induk = ... ROE = 30.184 ÷ 456.417 = 6,6%. ..."}
  ]
}
```

- `telusurfin_qa_train.jsonl`: 9.000 baris
- `telusurfin_qa_holdout.jsonl`: 1.000 baris (**jangan dipakai saat latih**)
- `stats.json`: jumlah per kategori dan tugas, panjang teks, daftar ticker sumber holdout

## Cara dataset dibuat

1. **`data`**: `generate.mjs` memuat `data/processed/raw_bei.csv`. Untuk setiap soal, satu baris emiten diskalakan (×0,25–4) dan setiap pos diberi derau ±8%. Nilai dibulatkan ke juta Rupiah, dan pos arus disesuaikan dengan panjang periode. Rasio, status, valuasi, dan tier dihitung dengan modul backend yang sama dengan aplikasi (`computeMetrics`, `computeValuation`, `assignTier`, `evaluateStatus`), sehingga angka di dataset sama dengan angka yang dihasilkan TelusurFin. Kasus valuasi yang tidak realistis (PER < 2x atau > 80x, premium > ±150%, EPS < Rp1) dibuang.
2. **`concept`**: 101 konsep ditulis ulang dengan kata-kata sendiri (`concepts_a/b/c.mjs`), masing-masing dengan 3 bentuk pertanyaan × 5 gaya (langsung, "tolong jelaskan", persona mahasiswa, "jawab singkat" dengan jawaban 2 kalimat, "bahasa sederhana"). Penomoran PSAK baru (berlaku 1 Januari 2024) dicek terhadap publikasi IAI tentang perubahan penomoran PSAK dan ISAK.
3. **`glossary`**: diambil dari `backend/config/glossary.json` dan ambang dari `backend/config/thresholds.json`. Contoh perhitungannya memakai angka acak.
4. **`refusal`**: templat pertanyaan × variasi jawaban. Pertanyaan "angka emiten tertentu" memakai ticker asli, tetapi jawabannya **tidak pernah berisi angka**, supaya model belajar mengarahkan pengguna ke mode Analisis emiten.
5. Pertanyaan yang sama persis (setelah dinormalisasi) hanya muncul sekali di seluruh dataset.

## Desain holdout

- **`data`**: 40 emiten sumber (10%) hanya dipakai untuk holdout. Profil keuangan holdout tidak pernah dilihat saat latih.
- **`concept`**: bentuk pertanyaan tertentu (pertanyaan ke-3 dengan gaya "bahasa sederhana", ditambah sebagian pertanyaan ke-2) hanya ada di holdout. Ini menguji apakah model memahami konsep, bukan menghafal kalimat pertanyaan.
- **`glossary`**: templat pertanyaan terakhir setiap kelompok hanya ada di holdout.
- **`refusal`**: sampel acak 10%.

## Saran pemakaian untuk fine-tuning

- **Prompt sistem** yang sama saat latih dan saat dipakai di aplikasi:
  > Anda adalah asisten keuangan TelusurFin. Jawab dalam bahasa Indonesia, berdasarkan laporan keuangan dan konsep akuntansi. Jangan memberi saran beli, jual, tahan, atau target harga. Jangan menebak angka emiten tertentu.
- **Mode berpikir Qwen3 dimatikan** (`enable_thinking=False` saat menerapkan template chat), sama seperti aplikasi memanggil Ollama dengan `think: false`.
- **QLoRA** di atas `Qwen3-1.7B`: rank 16, 2–3 epoch, learning rate 2e-4, panjang maksimum 1.024 token. Semua contoh di dataset ini jauh di bawah batas itu.
- **Hitung loss hanya pada jawaban assistant** (train on responses only), supaya model tidak belajar meniru gaya pertanyaan.
- **Ekspor ke GGUF `q4_k_m`**, lalu buat model Ollama dengan `Modelfile` yang memakai TEMPLATE Qwen3 asli (lihat konsep asisten AI, bagian 14).

## Evaluasi yang disarankan (holdout)

| Ukuran | Cara |
| --- | --- |
| Ketepatan angka (`data`) | Bandingkan angka di jawaban dengan angka di jawaban acuan (cocok persis setelah format Indonesia) |
| Ketaatan status | Status sehat/waspada/lemah di jawaban sama dengan acuan |
| Lolos pemeriksa narasi (`summary`) | Jalankan `checkQualitativeSentence(..., { allowNumbers: true })` dari backend pada setiap kalimat |
| Penolakan (`refusal`) | Persentase jawaban yang menolak memberi saran atau angka emiten |
| Konsep (`concept`, `glossary`) | Penilaian manual rubrik 0–2 pada sampel 50 soal |

Bandingkan `qwen3:1.7b` (dasar) dengan model hasil fine-tuning memakai holdout yang sama.

## Keterbatasan

- **Data `data` tersamar dan fiktif.** Angka tidak boleh dibaca sebagai kinerja emiten mana pun. Kemiripan nama perusahaan fiktif dengan perusahaan nyata tidak disengaja.
- **Ambang status bersifat umum lintas sektor** dan mengikuti `thresholds.json` versi 13 November 2026. Bila ambang diubah, dataset perlu dibuat ulang.
- **Konsep ditulis sebagai edukasi umum.** Ketentuan yang sering berubah, seperti batas autoreject dan biaya transaksi, sengaja tidak dimasukkan. Isi standar akuntansi diringkas, bukan dikutip, sehingga untuk detail resmi tetap rujuk publikasi IAI.
- **Gaya bahasa jawaban relatif seragam** karena berbasis templat. Dataset ini mengajarkan cara bernalar dan batasan, bukan keragaman gaya menulis.
- **Hanya emiten non-keuangan.** Bank dan asuransi tidak tercakup.

## Membuat ulang dataset

```bash
cd backend
node ../ai-model/dataset/telusurfin_qa/generate.mjs
```

Generator membaca modul backend dan `config/*.json` langsung. Kalau rumus, ambang, atau model klaster berubah, jalankan ulang supaya dataset tetap sama dengan perilaku aplikasi.

## Lisensi

Apache-2.0 untuk teks yang ditulis untuk dataset ini dan untuk kode generatornya. Data sumber `raw_bei.csv` berasal dari laporan keuangan publik emiten di BEI. Dataset hanya memuat versi yang telah disamarkan, sementara ticker asli hanya muncul di soal penolakan tanpa angka.
