import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import {
  deleteDocument,
  findByHash,
  insertDocument,
  listDocuments,
  setDocumentFile,
  type Doc,
  type LetterKind,
} from "./db";

type ImportedFile = {
  filename: string;
  title: string;
  rel_path: string;
  size_bytes: number;
  sha256: string;
};

export type ImportInput = {
  path: string;
  title: string;
  nomorSurat: string;
  unit: string;
  asalSurat: string;
  disposisi: string;
  tanggalSurat: string;
  kind: LetterKind;
};

export async function importLetter({
  path,
  title,
  nomorSurat,
  unit,
  asalSurat,
  disposisi,
  tanggalSurat,
  kind,
}: ImportInput): Promise<"added" | "skipped" | "restored"> {
  const file = await invoke<ImportedFile>("import_pdf", { sourcePath: path });
  const existing = await findByHash(file.sha256);
  if (existing) {
    // The row already knows this PDF. If its file was deleted outside the app,
    // put the new copy back on that row instead of refusing the import.
    const stillThere = existing.rel_path
      ? await invoke<boolean>("doc_exists", { relPath: existing.rel_path }).catch(() => false)
      : false;
    if (!stillThere) {
      await setDocumentFile(existing.id, file);
      return "restored";
    }
    // The copy already landed on disk; drop it, the archive keeps one copy.
    await invoke("delete_doc_file", { relPath: file.rel_path });
    return "skipped";
  }
  try {
    await insertDocument({
      // Rust already minted a UUID for the file name; reuse it instead of
      // crypto.randomUUID(), which needs a secure context.
      id: file.rel_path.replace(/\.pdf$/, ""),
      title: title.trim() || file.title,
      filename: file.filename,
      rel_path: file.rel_path,
      kind,
      size_bytes: file.size_bytes,
      sha256: file.sha256,
      added_at: new Date().toISOString(),
      nomor_surat: nomorSurat.trim() || null,
      unit: unit.trim() || null,
      asal_surat: asalSurat.trim() || null,
      disposisi: disposisi.trim() || null,
      tanggal_surat: tanggalSurat || null,
    });
  } catch (error) {
    await invoke("delete_doc_file", { relPath: file.rel_path });
    throw error;
  }
  return "added";
}

export async function readDocument(doc: Doc): Promise<Uint8Array> {
  const buffer = await invoke<ArrayBuffer>("read_doc_file", { relPath: doc.rel_path });
  return new Uint8Array(buffer);
}

/** Swaps the PDF behind an existing row. Metadata update stays with the caller. */
export async function replaceDocumentFile(
  doc: Doc,
  path: string,
): Promise<"replaced" | "same" | "duplicate"> {
  const file = await invoke<ImportedFile>("import_pdf", { sourcePath: path });
  if (file.sha256 === doc.sha256) {
    // Same content, but the stored file may have been deleted outside the app.
    const stillThere = doc.rel_path
      ? await invoke<boolean>("doc_exists", { relPath: doc.rel_path }).catch(() => false)
      : false;
    if (stillThere) {
      await invoke("delete_doc_file", { relPath: file.rel_path });
      return "same";
    }
    await setDocumentFile(doc.id, file);
    return "replaced";
  }
  if (await findByHash(file.sha256)) {
    await invoke("delete_doc_file", { relPath: file.rel_path });
    return "duplicate";
  }
  try {
    await setDocumentFile(doc.id, file);
  } catch (error) {
    await invoke("delete_doc_file", { relPath: file.rel_path });
    throw error;
  }
  // A metadata-only row has no old file to remove.
  if (doc.rel_path) {
    await invoke("delete_doc_file", { relPath: doc.rel_path });
  }
  return "replaced";
}

/** Shows the stored PDF in the OS file explorer so it can be dragged elsewhere. */
export async function revealDocumentFile(doc: Doc): Promise<void> {
  await invoke("reveal_doc_file", { relPath: doc.rel_path });
}

export async function saveDocumentCopy(doc: Doc): Promise<boolean> {
  const destination = await save({
    defaultPath: doc.filename,
    filters: [{ name: "Dokumen PDF", extensions: ["pdf"] }],
  });
  if (!destination) return false;
  await invoke("copy_doc_to", { relPath: doc.rel_path, destPath: destination });
  return true;
}

/** Reads metadata rows from a backup zip without restoring anything. */
export async function readBackupArchive(path: string): Promise<Doc[]> {
  return invoke<Doc[]>("read_backup_archive", { sourcePath: path });
}

export async function removeDocument(doc: Doc): Promise<void> {
  // Delete the row first: if the DB fails, the PDF is still there to retry.
  await deleteDocument(doc.id);
  // Metadata-only rows have no file to delete. A leftover file is cleaned up later.
  if (doc.rel_path) {
    await invoke("delete_doc_file", { relPath: doc.rel_path }).catch(() => undefined);
  }
}

/** Deletes PDFs in the archive folder that no row references any more. */
export async function cleanupOrphanFiles(): Promise<number> {
  const docs = await listDocuments();
  const keep = docs.map((doc) => doc.rel_path).filter(Boolean);
  return invoke<number>("cleanup_orphan_files", { keep });
}
