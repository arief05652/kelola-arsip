use sha2::{Digest, Sha256};
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};
use uuid::Uuid;

const MAX_PDF_BYTES: u64 = 100 * 1024 * 1024;

fn documents_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    // document_dir() can fail on Linux when xdg-user-dirs is not configured;
    // fall back to ~/Documents so import still works on a dev machine.
    let base = app.path().document_dir().or_else(|_| {
        app.path()
            .home_dir()
            .map(|home| home.join("Documents"))
    });
    let base = base.map_err(|e| format!("Folder Documents tidak ditemukan: {e}"))?;
    let dir = base.join("KelolaArsip");
    fs::create_dir_all(&dir).map_err(|e| format!("Gagal membuat folder arsip: {e}"))?;
    Ok(dir)
}

/// Rejects anything that is not a bare file name, so a stored path can never
/// escape the archive folder.
fn safe_file_name(rel_path: &str) -> Result<&str, String> {
    let invalid = rel_path.is_empty()
        || rel_path.contains('/')
        || rel_path.contains('\\')
        || rel_path.contains("..");
    if invalid {
        return Err("Path dokumen tidak valid".into());
    }
    Ok(rel_path)
}

#[derive(serde::Serialize)]
struct ImportedFile {
    filename: String,
    title: String,
    rel_path: String,
    size_bytes: u64,
    sha256: String,
}

#[tauri::command]
fn import_pdf(app: tauri::AppHandle, source_path: String) -> Result<ImportedFile, String> {
    let source = PathBuf::from(&source_path);
    if !source.is_file() {
        return Err("File tidak ditemukan".into());
    }
    let is_pdf = source
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("pdf"))
        .unwrap_or(false);
    if !is_pdf {
        return Err("Hanya file PDF yang didukung".into());
    }

    let bytes = fs::read(&source).map_err(|e| format!("Gagal membaca file: {e}"))?;
    let size_bytes = bytes.len() as u64;
    if size_bytes > MAX_PDF_BYTES {
        return Err("Ukuran PDF melebihi 100 MB".into());
    }

    let digest = Sha256::digest(&bytes);
    let sha256: String = digest.iter().map(|b| format!("{b:02x}")).collect();

    let id = Uuid::new_v4().to_string();
    let rel_path = format!("{id}.pdf");
    let dir = documents_dir(&app)?;
    let tmp_path = dir.join(format!("{id}.tmp"));

    // Write to a temp file and rename, so an interrupted import never leaves a
    // half-written PDF under the final name.
    fs::write(&tmp_path, &bytes).map_err(|e| format!("Gagal menulis file: {e}"))?;
    if let Err(e) = fs::rename(&tmp_path, dir.join(&rel_path)) {
        let _ = fs::remove_file(&tmp_path);
        return Err(format!("Gagal menyimpan file: {e}"));
    }

    let filename = source
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("dokumen.pdf")
        .to_string();
    let title = source
        .file_stem()
        .and_then(|name| name.to_str())
        .unwrap_or("Dokumen")
        .to_string();

    Ok(ImportedFile {
        filename,
        title,
        rel_path,
        size_bytes,
        sha256,
    })
}

#[tauri::command]
fn delete_doc_file(app: tauri::AppHandle, rel_path: String) -> Result<(), String> {
    let name = safe_file_name(&rel_path)?;
    let path = documents_dir(&app)?.join(name);
    match fs::remove_file(&path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("Gagal menghapus file: {e}")),
    }
}

#[tauri::command]
fn doc_path(app: tauri::AppHandle, rel_path: String) -> Result<String, String> {
    let name = safe_file_name(&rel_path)?;
    let path = documents_dir(&app)?.join(name);
    Ok(path.to_string_lossy().to_string())
}

/// Returns the raw PDF bytes so the frontend can render it with pdf.js.
#[tauri::command]
fn read_doc_file(app: tauri::AppHandle, rel_path: String) -> Result<tauri::ipc::Response, String> {
    let name = safe_file_name(&rel_path)?;
    let bytes = fs::read(documents_dir(&app)?.join(name))
        .map_err(|e| format!("Gagal membaca file: {e}"))?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
fn doc_exists(app: tauri::AppHandle, rel_path: String) -> Result<bool, String> {
    let name = safe_file_name(&rel_path)?;
    Ok(documents_dir(&app)?.join(name).is_file())
}

#[tauri::command]
fn copy_doc_to(app: tauri::AppHandle, rel_path: String, dest_path: String) -> Result<(), String> {
    let name = safe_file_name(&rel_path)?;
    let source = documents_dir(&app)?.join(name);
    fs::copy(&source, PathBuf::from(dest_path)).map_err(|e| format!("Gagal menyalin file: {e}"))?;
    Ok(())
}

#[tauri::command]
fn documents_dir_path(app: tauri::AppHandle) -> Result<String, String> {
    Ok(documents_dir(&app)?.to_string_lossy().to_string())
}

#[derive(serde::Serialize, serde::Deserialize)]
struct BackupRow {
    id: String,
    title: String,
    filename: String,
    rel_path: String,
    kind: String,
    size_bytes: u64,
    sha256: String,
    added_at: String,
    #[serde(default)]
    nomor_surat: Option<String>,
    #[serde(default)]
    unit: Option<String>,
    #[serde(default)]
    asal_surat: Option<String>,
    #[serde(default)]
    disposisi: Option<String>,
}

/// Writes `data.json` plus every PDF into one zip. Returns how many files were packed.
#[tauri::command]
fn backup_archive(
    app: tauri::AppHandle,
    dest_path: String,
    rows: Vec<BackupRow>,
) -> Result<u32, String> {
    pack_archive(&documents_dir(&app)?, &dest_path, &rows)
}

fn pack_archive(dir: &std::path::Path, dest_path: &str, rows: &[BackupRow]) -> Result<u32, String> {
    let file = fs::File::create(dest_path).map_err(|e| format!("Gagal membuat file backup: {e}"))?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let json = serde_json::to_vec_pretty(&rows).map_err(|e| format!("Gagal menulis metadata: {e}"))?;
    zip.start_file("data.json", options)
        .map_err(|e| format!("Gagal menulis data.json: {e}"))?;
    zip.write_all(&json)
        .map_err(|e| format!("Gagal menulis data.json: {e}"))?;

    let mut packed = 0u32;
    for row in rows {
        // A row with an unusable file name is skipped instead of aborting the whole backup.
        let Ok(name) = safe_file_name(&row.rel_path) else {
            continue;
        };
        let path = dir.join(name);
        if !path.is_file() {
            continue;
        }
        let mut source = fs::File::open(&path).map_err(|e| format!("Gagal membaca {name}: {e}"))?;
        zip.start_file(format!("files/{name}"), options)
            .map_err(|e| format!("Gagal menulis {name}: {e}"))?;
        std::io::copy(&mut source, &mut zip).map_err(|e| format!("Gagal menulis {name}: {e}"))?;
        packed += 1;
    }

    zip.finish().map_err(|e| format!("Gagal menyelesaikan backup: {e}"))?;
    Ok(packed)
}

/// Restores PDFs from a backup zip and returns the metadata rows the frontend should insert.
#[tauri::command]
fn restore_archive(app: tauri::AppHandle, source_path: String) -> Result<Vec<BackupRow>, String> {
    unpack_archive(&documents_dir(&app)?, &source_path)
}

fn unpack_archive(dir: &std::path::Path, source_path: &str) -> Result<Vec<BackupRow>, String> {
    let file = fs::File::open(source_path).map_err(|e| format!("Gagal membuka backup: {e}"))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("File backup tidak valid: {e}"))?;

    let rows: Vec<BackupRow> = {
        let mut entry = archive
            .by_name("data.json")
            .map_err(|_| "Backup tidak berisi data.json".to_string())?;
        let mut buffer = Vec::new();
        entry
            .read_to_end(&mut buffer)
            .map_err(|e| format!("Gagal membaca data.json: {e}"))?;
        serde_json::from_slice(&buffer).map_err(|e| format!("data.json rusak: {e}"))?
    };

    let mut restored = Vec::new();
    for row in rows {
        let Ok(name) = safe_file_name(&row.rel_path) else {
            continue;
        };
        let target = dir.join(name);
        // A file on disk only counts as usable when its hash matches the metadata.
        let intact = target.is_file()
            && file_sha256(&target)
                .map(|hash| hash == row.sha256)
                .unwrap_or(false);
        if !intact {
            let entry_name = format!("files/{name}");
            if let Ok(mut entry) = archive.by_name(&entry_name) {
                let mut bytes = Vec::new();
                entry
                    .read_to_end(&mut bytes)
                    .map_err(|e| format!("Gagal membaca {name}: {e}"))?;
                // The copy inside the zip must match the metadata before it replaces anything.
                let digest = Sha256::digest(&bytes);
                let hash: String = digest.iter().map(|b| format!("{b:02x}")).collect();
                if hash != row.sha256 {
                    continue;
                }
                fs::write(&target, &bytes).map_err(|e| format!("Gagal menulis {name}: {e}"))?;
            } else if !target.is_file() {
                // Neither on disk nor in the archive: skip so no broken row is created.
                continue;
            }
        }
        restored.push(row);
    }

    Ok(restored)
}

fn file_sha256(path: &std::path::Path) -> Result<String, String> {
    let mut file =
        fs::File::open(path).map_err(|e| format!("Gagal membaca {}: {e}", path.display()))?;
    let mut hasher = Sha256::new();
    std::io::copy(&mut file, &mut hasher)
        .map_err(|e| format!("Gagal membaca {}: {e}", path.display()))?;
    Ok(hasher.finalize().iter().map(|b| format!("{b:02x}")).collect())
}

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create documents table",
            sql: "CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            filename TEXT NOT NULL,
            rel_path TEXT NOT NULL,
            kind TEXT NOT NULL DEFAULT 'masuk',
            size_bytes INTEGER NOT NULL,
            sha256 TEXT NOT NULL UNIQUE,
            added_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_documents_kind ON documents(kind);
        CREATE INDEX IF NOT EXISTS idx_documents_added_at ON documents(added_at);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add nomor_surat column",
            sql: "ALTER TABLE documents ADD COLUMN nomor_surat TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add unit column",
            sql: "ALTER TABLE documents ADD COLUMN unit TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add asal_surat column",
            sql: "ALTER TABLE documents ADD COLUMN asal_surat TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add disposisi column",
            sql: "ALTER TABLE documents ADD COLUMN disposisi TEXT;",
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:kelola-arsip.db", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            import_pdf,
            delete_doc_file,
            doc_path,
            read_doc_file,
            doc_exists,
            copy_doc_to,
            documents_dir_path,
            backup_archive,
            restore_archive
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{pack_archive, safe_file_name, unpack_archive, BackupRow};
    use sha2::Digest;
    use std::fs;

    #[test]
    fn rejects_path_traversal() {
        assert!(safe_file_name("../secret.pdf").is_err());
        assert!(safe_file_name("sub/dir.pdf").is_err());
        assert!(safe_file_name("sub\\dir.pdf").is_err());
        assert!(safe_file_name("").is_err());
    }

    #[test]
    fn accepts_plain_file_name() {
        assert_eq!(safe_file_name("abc-123.pdf").unwrap(), "abc-123.pdf");
    }

    fn sample_row(rel_path: &str) -> BackupRow {
        let digest = sha2::Sha256::digest(b"%PDF-1.4 isi");
        let sha256: String = digest.iter().map(|b| format!("{b:02x}")).collect();
        BackupRow {
            id: "abc-123".into(),
            title: "Surat Uji".into(),
            filename: "surat.pdf".into(),
            rel_path: rel_path.into(),
            kind: "masuk".into(),
            size_bytes: 12,
            sha256,
            added_at: "2026-01-01T00:00:00Z".into(),
            nomor_surat: Some("012/KS/2026".into()),
            unit: None,
            asal_surat: None,
            disposisi: Some("Tindak lanjuti".into()),
        }
    }

    #[test]
    fn backup_round_trip_restores_files_and_metadata() {
        let root = std::env::temp_dir().join(format!("kelola-arsip-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let pdf = root.join("abc-123.pdf");
        fs::write(&pdf, b"%PDF-1.4 isi").unwrap();

        let zip_path = root.join("backup.zip");
        let packed = pack_archive(&root, zip_path.to_str().unwrap(), &[sample_row("abc-123.pdf")]);
        assert_eq!(packed.unwrap(), 1);

        fs::remove_file(&pdf).unwrap();
        let restored = unpack_archive(&root, zip_path.to_str().unwrap()).unwrap();
        assert_eq!(restored.len(), 1);
        assert_eq!(restored[0].nomor_surat.as_deref(), Some("012/KS/2026"));
        assert!(pdf.is_file(), "PDF harus dipulihkan dari zip");

        fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn backup_skips_rows_with_unsafe_names() {
        let root = std::env::temp_dir().join(format!("kelola-arsip-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let zip_path = root.join("backup.zip");

        let packed = pack_archive(&root, zip_path.to_str().unwrap(), &[sample_row("../evil.pdf")]);
        assert_eq!(packed.unwrap(), 0);
        assert!(!root.join("../evil.pdf").exists());

        fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn backup_keeps_the_original_file() {
        let root = std::env::temp_dir().join(format!("kelola-arsip-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let pdf = root.join("abc-123.pdf");
        fs::write(&pdf, b"%PDF-1.4 isi").unwrap();

        let zip_path = root.join("backup.zip");
        pack_archive(&root, zip_path.to_str().unwrap(), &[sample_row("abc-123.pdf")]).unwrap();

        assert_eq!(fs::read(&pdf).unwrap(), b"%PDF-1.4 isi");
        assert!(zip_path.is_file());

        fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn restore_repairs_a_corrupted_file() {
        let root = std::env::temp_dir().join(format!("kelola-arsip-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let pdf = root.join("abc-123.pdf");
        fs::write(&pdf, b"%PDF-1.4 isi").unwrap();

        let zip_path = root.join("backup.zip");
        pack_archive(&root, zip_path.to_str().unwrap(), &[sample_row("abc-123.pdf")]).unwrap();

        fs::write(&pdf, b"rusak").unwrap();
        let restored = unpack_archive(&root, zip_path.to_str().unwrap()).unwrap();

        assert_eq!(restored.len(), 1);
        assert_eq!(fs::read(&pdf).unwrap(), b"%PDF-1.4 isi");

        fs::remove_dir_all(&root).ok();
    }
}
