# Progress — Kelola Arsip

Aplikasi desktop arsip surat/PDF. Tauri v2 + React 19 + TypeScript + Vite.
Target OS: Windows. Development: Linux.

Terakhir diperbarui: 10 November 2026

## Status ringkas

| Area | Status |
|---|---|
| Scaffold Tauri + React | Selesai |
| UI Dashboard | Selesai |
| Backend Rust (storage PDF) | Selesai |
| Database SQLite | Selesai |
| Import & simpan PDF | Selesai |
| Navigasi & halaman | Selesai |
| PDF viewer | Belum mulai |
| Print | Belum mulai |
| Build & distribusi Windows | Belum mulai |

## Milestone

| # | Milestone | Status | Catatan |
|---|---|---|---|
| M0 | Bersihkan template & identitas aplikasi | Selesai | Demo `greet()` dihapus, jendela 1280x820 (min 1024x680). |
| M1 | Storage PDF + SQLite | Selesai | Copy atomik, dedupe SHA-256, migrasi tabel `documents`. |
| M2 | Library dokumen | Selesai | Import, daftar, cari, buka, simpan salinan, hapus. |
| M3 | PDF viewer | Sebagian | Buka di app, navigasi halaman, zoom. Rotate, outline, thumbnail, Ctrl+F belum. |
| M4 | Print | Belum mulai | Render canvas + `window.print()`, fallback buka aplikasi default. |
| M5 | Build Windows | Sebagian | Installer NSIS berhasil dibuat dari Linux (`cargo-xwin`), belum diuji di mesin Windows. CI `windows-latest` belum ada. |
| M6 | Polish | Sebagian | Backup/restore ZIP selesai. File hilang, guard ukuran, rename, tema belum. |

## Yang sudah dikerjakan

### Backend Rust (`src-tauri/src/lib.rs`)
- `import_pdf` — validasi ekstensi PDF, batas 100 MB, hash SHA-256, salin ke `Documents/KelolaArsip/<uuid>.pdf` lewat file temp lalu rename.
- `delete_doc_file`, `doc_path`, `doc_exists`, `copy_doc_to`, `documents_dir_path`.
- `safe_file_name` menolak path berisi `/`, `\`, atau `..` — frontend hanya boleh mengirim nama file.
- Fallback folder: kalau `document_dir()` gagal (Linux tanpa xdg-user-dirs), pakai `~/Documents`.
- Plugin: `tauri-plugin-dialog`, `tauri-plugin-sql` (fitur sqlite), `tauri-plugin-opener`.
- 2 unit test Rust untuk validasi path, lolos `cargo test`.

### Database
- File: `<app config dir>/kelola-arsip.db` (Linux: `~/.config/com.kelola-arsip/`).
- Migrasi versi 1: tabel `documents` + index `kind` dan `added_at`.
- Kolom: `id, title, filename, rel_path, kind, size_bytes, sha256, added_at`.
- Dedupe: `sha256` UNIQUE, file duplikat dihapus lagi setelah copy.

### Frontend
- Halaman: Dashboard, Surat Masuk, Surat Keluar, Laporan. Navigasi pakai state `Page`, tanpa router.
- Dashboard: 5 kartu statistik, grafik volume 10 bulan, tabel surat masuk terbaru, feed aktivitas — semua dihitung dari data asli.
- Surat Masuk/Keluar: pencarian judul/nama file, import sesuai jenis halaman, buka, simpan salinan, hapus dengan konfirmasi.
- Laporan: rekap 12 bulan (masuk, keluar, total) + total penyimpanan.
- Tidak ada data mock. Database kosong menampilkan empty state, bukan angka palsu.
- Komponen: `Sidebar`, `StatCards`, `VolumeChart`, `DocumentTable`, `ActivityFeed`, `Toast`.
- Styling Tailwind v4 + `lucide-react`; grafik dibuat manual dengan div.

### Verifikasi
- `bun run build` lolos (tsc strict + vite).
- `cargo check` lolos, `cargo test` 2 test lolos.
- Aplikasi dijalankan di Linux: jendela tampil, migrasi SQLite berjalan, tabel `documents` terbentuk, folder `~/Documents/KelolaArsip` dibuat.
- Import lewat dialog file belum diuji ujung-ke-ujung secara otomatis.

## Perbedaan dari mockup

Tiga kartu statistik diganti karena data aslinya tidak ada di sistem: "Dalam Prosedur", "Periode Ini Aktif", dan "Panggilan Aktif" menjadi "Total Dokumen", "Bulan Ini", dan "Ukuran Arsip". Kartu "Surat Masuk" dan "Surat Keluar" tetap.

## Keputusan yang sudah dikunci

- PDF disalin ke `%USERPROFILE%\Documents\KelolaArsip\<uuid>.pdf` (copy, bukan referensi).
- Metadata di SQLite lewat `tauri-plugin-sql`.
- File I/O hanya di Rust; frontend tidak memegang path arbitrer.
- Render PDF nanti pakai `pdfjs-dist`. Tidak pakai `<embed>`/`<iframe>` karena WebKitGTK tidak punya viewer bawaan, WebView2 punya.
- Rilis pertama: navigasi, zoom, rotate, outline, thumbnail, cari teks, print.
- Ditunda: highlight/anotasi, auto-update, form filling.

## Risiko yang masih terbuka

- Print in-app rapuh; `window.print()` belum tentu jalan di WebKitGTK. Fallback "buka di aplikasi PDF default" wajib ada.
- WebKitGTK vs WebView2: tampilan dan font bisa berbeda. Verifikasi visual wajib di Windows.
- `sql:allow-execute` harus tetap ada di capabilities, kalau tidak insert/delete gagal saat runtime.
- PDF hasil scan tidak punya text layer: pencarian dan seleksi tidak jalan.
- Installer tanpa code signing memicu peringatan SmartScreen.
- PDF >100 MB ditolak (batas di `import_pdf`).
- Menghapus dokumen langsung menghapus file PDF tanpa tempat sampah.

## Cara menjalankan

```bash
bun run tauri dev     # aplikasi desktop
bun run build         # typecheck + build frontend
cd src-tauri && cargo test
```

## Build Windows dari Linux

```bash
rustup target add x86_64-pc-windows-msvc
cargo install cargo-xwin --locked
sudo apt install -y nsis
bun run tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc --bundles nsis
```

Hasil: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Kelola Arsip_0.1.0_x64-setup.exe` (2,4 MB). Terverifikasi sebagai PE32 NSIS installer; belum dijalankan di Windows.

## Langkah berikutnya

1. M3 lanjutan: rotate, outline, thumbnail, Ctrl+F, dan simpan halaman terakhir.
2. M4: print dengan fallback buka aplikasi default.
3. M5: CI `windows-latest`, installer NSIS, uji di VM Windows.
