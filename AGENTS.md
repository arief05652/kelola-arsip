# AGENTS.md

Tauri v2 desktop app (`kelola-arsip`): React 19 + TypeScript + Vite frontend, Rust backend.
Target OS is **Windows**; development happens on **Linux**.

## Commands

Package manager is **bun** (`bun.lock`; `tauri.conf.json` `beforeDevCommand`/`beforeBuildCommand` call `bun run`).

- `bun run tauri dev` — run the desktop app (not `bun run dev`; that only starts Vite on port 1420)
- `bun run tauri build` — release build + bundle
- `bun run build` — `tsc && vite build`; this is the only typecheck. There is no lint script and no CI.
- `cargo check` in `src-tauri/` — fastest Rust feedback; `cargo test` runs the path-traversal tests in `lib.rs`

`tsc` has `noUnusedLocals` and `noUnusedParameters` on, so `bun run build` fails on unused variables.

## Wiring

- Rust entrypoint: `src-tauri/src/main.rs` only calls `kelola_arsip_lib::run()`. Put app logic in `src-tauri/src/lib.rs`. The `windows_subsystem = "windows"` attribute in `main.rs` is required — do not remove it.
- Adding a Tauri command takes two edits: the `#[tauri::command]` fn **and** registration in `invoke_handler![...]` in `lib.rs`. A command that is not registered fails at runtime, not compile time.
- Adding a Tauri plugin takes three edits: `src-tauri/Cargo.toml`, `.plugin(...)` in `lib.rs`, and the permission entry in `src-tauri/capabilities/default.json`. Missing the permission makes the JS API throw at runtime.
- `src-tauri/gen/schemas/` is generated — never edit.
- Frontend talks to Rust via `invoke()` from `@tauri-apps/api/core`; there is no HTTP backend.

## Platform gotchas

- Dev on Linux renders in **WebKitGTK**; the Windows build renders in **WebView2 (Chromium)**. Anything visual or printing-related must be re-checked on Windows.
- `vite.config.ts` pins port 1420 with `strictPort: true`; a second dev server will fail instead of picking another port.
- Linux build deps are installed here (webkit2gtk-4.1, gtk3). `patchelf` is not — only needed for Linux AppImage bundling.
- Cross-compiling to Windows from Linux only works with NSIS (`--bundles nsis`, `cargo-xwin`); MSI/WiX needs a Windows host.

## Repo state

- No mock data. The UI reads real rows from SQLite; an empty archive shows empty states, not placeholder numbers. Do not reintroduce sample data.
- Rust owns all file I/O: `import_pdf`, `delete_doc_file`, `doc_path`, `read_doc_file`, `doc_exists`, `copy_doc_to`, `documents_dir_path`, `backup_archive`, `restore_archive` in `lib.rs`. The frontend only ever passes a bare `<uuid>.pdf` name, which `safe_file_name` enforces.
- Frontend: `src/lib/db.ts` (plugin-sql queries), `src/lib/documents.ts` (import/open/save/delete), `src/pages/*` (dashboard, letters, report). Navigation is a `Page` state in `App.tsx`, not a router.
- SQLite lives at `<app config dir>/kelola-arsip.db`; schema is created by the migration list in `lib.rs` (version 1 = `documents`, version 2 = `nomor_surat`). Bump the version to add a migration.
- `sql:default` does **not** include `allow-execute`; inserts/deletes need `sql:allow-execute` in `capabilities/default.json` or they fail at runtime.
- Styling is Tailwind v4 through `@tailwindcss/vite` (CSS-first config in `src/index.css`, no `tailwind.config.js`). Icons come from `lucide-react`. The bar chart is hand-rolled divs, not a chart library — do not add one for this.
- `ui/*.png` are design mockups (dashboard, surat masuk, surat keluar) — source of truth for layout and spacing.
- `README.md` documents setup, build paths, data locations, and troubleshooting; keep it in sync when those change.
- `graphify-out/` holds generated knowledge-graph output and is not in `.gitignore`.

## Not built yet

- Print and the last-opened page/zoom fields. The in-app viewer (`src/components/PdfViewer.tsx`) uses `pdfjs-dist`; never use `<embed>`/`<iframe>` for PDFs: WebKitGTK has no built-in viewer, WebView2 does.
- Highlights/annotations, auto-update, form filling.
