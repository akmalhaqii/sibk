// FR-ING: simpan PDF, deteksi text layer, temukan halaman laporan inti (kode taksonomi / judul)
// R-11: gunakan pdfjs-dist/legacy/build/pdf.mjs untuk lingkungan Node.js.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function ingest(file) {
  // pdfjsLib.getDocument(...) -> per halaman cek text layer & klasifikasi (posisi_keuangan | laba_rugi | arus_kas)
  return [];
}
