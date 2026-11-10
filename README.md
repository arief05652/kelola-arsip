# Kelola Arsip

Aplikasi desktop untuk mengarsipkan surat masuk dan surat keluar dalam bentuk PDF.

Dibangun dengan Tauri v2: frontend React 19 + TypeScript + Vite, backend Rust, metadata di SQLite.
Target rilis: **Windows**. Pengembangan sehari-hari: **Linux**.

## Fitur

- **Dashboard** — 5 kartu statistik (surat masuk, surat keluar, total dokumen, bulan ini, ukuran arsip), grafik volume 10 bulan, tabel surat masuk terbaru, dan feed aktivitas.
- **Surat Masuk / Surat Keluar** — impor PDF, pencarian judul/nama file, pratinjau, edit, simpan salinan, hapus.
- **Pohon bidang** — di sidebar, Surat Keluar bisa disaring per Sekretaris, Bidang PIAK, atau Bidang Yanminduk.
- **Laporan** — rekap 12 bulan terakhir, total penyimpanan, dan tombol Backup/Pulihkan (satu file ZIP berisi metadata + semua PDF).
- **Pratinjau PDF** — buka dokumen di dalam aplikasi dengan pdf.js: navigasi halaman, zoom, `Esc` untuk menutup.
- **Impor PDF** — file disalin ke folder arsip dengan nama `<uuid>.pdf`, deduplikasi SHA-256, batas 100 MB, penulisan atomik (temp lalu rename).
- **Tanpa data mock** — semua angka dihitung dari isi database. Arsip kosong menampilkan empty state.

Belum ada: print, highlight/anotasi, auto-update.

## Kebutuhan

### Semua platform

| Alat | Versi | Catatan |
|---|---|---|
| [Bun](https://bun.sh) | 1.x | package manager proyek ini (`bun.lock`). `npm`/`pnpm` tidak dipakai. |
| [Rust](https://rustup.rs) | stable | `cargo` harus ada di `PATH`. |
| Node.js | 20+ | hanya untuk tooling Vite/CLI. Bun menjalankan skrip. |

### Linux (development)

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

`patchelf` hanya dibutuhkan kalau membuat AppImage.

### Windows (target rilis)

- **Rust MSVC toolchain** — `rustup default stable-x86_64-pc-windows-msvc`
- **Visual Studio Build Tools** dengan workload *Desktop development with C++* (menyediakan MSVC linker)
- **WebView2 Runtime** — sudah ada di Windows 10/11 terbaru. Kalau tidak ada, installer Tauri mengunduhnya otomatis (butuh internet).
- **Bun** dan **Node.js**

## Menjalankan

```bash
bun install
bun run tauri dev
```

Jendela aplikasi terbuka dan Vite berjalan di port 1420 (`strictPort`, jadi port tidak akan bergeser).

> `bun run dev` hanya menyalakan Vite di browser. Untuk aplikasi desktop, selalu pakai `bun run tauri dev`.

## Build

### Linux

```bash
bun run tauri build
```

Hasil ada di `src-tauri/target/release/bundle/`.

### Windows dari mesin Windows

```bash
bun run tauri build
```

Installer NSIS ada di `src-tauri/target/release/bundle/nsis/`.

### Windows dari Linux (cross-compile)

Hanya installer **NSIS** yang bisa dibuat dari Linux. MSI/WiX wajib build di Windows.

Sekali saja, siapkan alatnya:

```bash
rustup target add x86_64-pc-windows-msvc
cargo install cargo-xwin --locked
sudo apt install -y nsis
```

Lalu build:

```bash
bun run tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc --bundles nsis
```

Hasil:

```
src-tauri/target/x86_64-pc-windows-msvc/release/kelola-arsip.exe
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Kelola Arsip_0.1.0_x64-setup.exe
```

Catatan penting:

- `bun run tauri build` tanpa `--target` di Linux menghasilkan binary **Linux** (`ELF`), bukan `.exe`. Binary itu tidak bisa dijalankan di Windows.
- Unduhan MSVC SDK oleh `cargo-xwin` pertama kali sekitar 1 GB dan disimpan di cache.
- Cross-compile ditandai *experimental* oleh Tauri. Selalu uji installer di mesin Windows sungguhan.
- Installer tidak ditandatangani, jadi SmartScreen akan menampilkan peringatan saat pertama dibuka.

## Perintah harian

| Perintah | Fungsi |
|---|---|
| `bun run tauri dev` | Jalankan aplikasi desktop (hot reload). |
| `bun run build` | Typecheck `tsc` + build frontend ke `dist/`. Satu-satunya typecheck. |
| `bun run tauri build` | Build rilis + bundle. |
| `cd src-tauri && cargo check` | Umpan balik Rust tercepat. |
| `cd src-tauri && cargo test` | Uji validasi path traversal di `lib.rs`. |

`tsc` memakai `noUnusedLocals` dan `noUnusedParameters`, jadi variabel yang tidak dipakai menggagalkan `bun run build`. Tidak ada lint script dan tidak ada CI.

## Struktur proyek

```
src/                        Frontend React
  App.tsx                   State halaman, handler impor/buka/simpan/hapus
  components/
    Sidebar.tsx             Navigasi + tombol Tambah Dokumen
    StatCards.tsx           5 kartu statistik dashboard
    VolumeChart.tsx         Grafik batang (div manual, tanpa library chart)
    DocumentTable.tsx       Tabel dokumen + aksi buka/salin/hapus
    ActivityFeed.tsx        Feed aktivitas terbaru
    Toast.tsx               Notifikasi singkat
  pages/
    Dashboard.tsx           Ringkasan
    Letters.tsx             Surat masuk / surat keluar (dipakai ulang)
    Report.tsx              Laporan 12 bulan
  lib/
    db.ts                   Query plugin-sql, tipe `Doc`
    documents.ts            Impor, buka, simpan salinan, hapus
    stats.ts                Agregasi angka dashboard
    format.ts               Ukuran, tanggal, "3 jam lalu", label bulan
    types.ts                Tipe `Page` dan `DocActions`
src-tauri/
  src/main.rs               Entry point, hanya memanggil `kelola_arsip_lib::run()`
  src/lib.rs                Semua command Rust, migrasi SQLite, unit test
  capabilities/default.json Daftar izin plugin
  tauri.conf.json           Konfigurasi jendela dan bundler
ui/                         Mockup desain (sumber kebenaran layout)
PROGRESS.md                 Status milestone M0–M6
```

## Arsitektur

**Navigasi** memakai state `Page` di `App.tsx`, bukan router.

**File I/O hanya di Rust.** Frontend tidak pernah memegang path arbitrer; ia hanya mengirim nama file `<uuid>.pdf`, dan `safe_file_name` menolak `/`, `\`, dan `..`.

Command Tauri yang tersedia:

| Command | Fungsi |
|---|---|
| `import_pdf` | Validasi PDF, batas 100 MB, hitung SHA-256, salin ke folder arsip. |
| `delete_doc_file` | Hapus PDF dari folder arsip. |
| `doc_path` | Path absolut sebuah dokumen. |
| `doc_exists` | Cek file masih ada. |
| `copy_doc_to` | Simpan salinan ke lokasi pilihan pengguna. |
| `read_doc_file` | Byte PDF mentah untuk dirender pdf.js. |
| `backup_archive` | Bungkus `data.json` + semua PDF ke satu ZIP. |
| `restore_archive` | Ekstrak PDF dari ZIP dan kembalikan baris metadata. |
| `documents_dir_path` | Lokasi folder arsip. |

Menambah command butuh **dua** suntingan: fungsi `#[tauri::command]` dan pendaftaran di `invoke_handler![...]` dalam `lib.rs`. Command yang lupa didaftarkan gagal saat runtime, bukan saat kompilasi.

Menambah plugin butuh **tiga** suntingan: `src-tauri/Cargo.toml`, `.plugin(...)` di `lib.rs`, dan entri izin di `src-tauri/capabilities/default.json`.

**Styling** Tailwind v4 lewat `@tailwindcss/vite` (konfigurasi CSS-first di `src/index.css`, tanpa `tailwind.config.js`). Ikon dari `lucide-react`.

## Lokasi data

| Data | Linux | Windows |
|---|---|---|
| Database | `~/.config/com.kelola-arsip/kelola-arsip.db` | `%APPDATA%\com.kelola-arsip\kelola-arsip.db` |
| PDF | `~/Documents/KelolaArsip/` | `%USERPROFILE%\Documents\KelolaArsip\` |

Skema dibuat oleh migrasi versi 1 di `lib.rs`. Untuk mengubah skema, tambahkan migrasi baru dan naikkan versinya — jangan ubah migrasi lama.

Kolom tabel `documents`: `id, title, filename, rel_path, kind, size_bytes, sha256, added_at`. `sha256` UNIQUE, dipakai untuk deduplikasi.

Menghapus dokumen menghapus file PDF-nya secara permanen, tanpa tempat sampah.

**Backup:** tombol Backup di halaman Laporan menyalin seluruh metadata ke `data.json` dan semua PDF ke `files/<uuid>.pdf` di dalam satu file ZIP. Proses ini hanya membaca file asli; tidak ada file yang dipindahkan atau dihapus. Pulihkan membaca ZIP yang sama: PDF yang belum ada disalin ke folder arsip, PDF yang hash-nya tidak cocok dengan metadata ditimpa dari ZIP, dan baris yang sudah ada dilewati (`INSERT OR IGNORE`).

## Troubleshooting

**Impor atau hapus gagal tanpa pesan jelas.**
`sql:default` hanya memberi `load`, `select`, dan `close`. Insert dan delete butuh `sql:allow-execute` di `capabilities/default.json`. Kalau entri itu hilang, operasi gagal saat runtime.

**`bun run tauri build` menghasilkan file tanpa ekstensi dan Windows menanyakan "How do you want to open this file?".**
Build berjalan untuk Linux. Tambahkan `--runner cargo-xwin --target x86_64-pc-windows-msvc`.

**`failed to run command makensis.exe: No such file or directory`.**
NSIS belum terpasang di host Linux. Jalankan `sudo apt install -y nsis`.

**`error while loading shared libraries: libwebkit2gtk-4.1.so.0`.**
Dependensi GTK/WebKitGTK belum lengkap. Lihat bagian *Kebutuhan* di atas.

**Tampilan berbeda antara Linux dan Windows.**
Linux memakai WebKitGTK, Windows memakai WebView2 (Chromium). Selisih font, spasi, dan hasil print wajar terjadi. Verifikasi visual selalu di Windows.

**PDF hasil scan tidak bisa dicari.**
File scan tidak punya text layer, jadi pencarian teks tidak akan menemukan apa pun. Ini batasan sumber, bukan bug.

**PDF ditolak saat impor.**
Batas ukuran 100 MB dan hanya ekstensi `.pdf`.

## Menuju rilis berikutnya

1. Rotate, outline, thumbnail, dan Ctrl+F di dalam viewer.
2. Print, dengan fallback "buka di aplikasi PDF default".
3. CI `windows-latest` untuk membangun installer otomatis.
