// NFR-04: log per dokumen (halaman, hasil validasi, versi model, durasi)
export const log = (...a) => console.log(new Date().toISOString(), ...a);