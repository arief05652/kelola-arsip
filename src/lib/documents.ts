import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import {
  deleteDocument,
  findByHash,
  insertDocument,
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
  kind: LetterKind;
};

export async function importLetter({
  path,
  title,
  nomorSurat,
  unit,
  asalSurat,
  disposisi,
  kind,
}: ImportInput): Promise<"added" | "skipped"> {
  const file = await invoke<ImportedFile>("import_pdf", { sourcePath: path });
  if (await findByHash(file.sha256)) {
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
    await invoke("delete_doc_file", { relPath: file.rel_path });
    return "same";
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
  await invoke("delete_doc_file", { relPath: doc.rel_path });
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
  // Metadata-only rows have no file to delete.
  if (doc.rel_path) {
    await invoke("delete_doc_file", { relPath: doc.rel_path });
  }
  await deleteDocument(doc.id);
}
