import Database from "@tauri-apps/plugin-sql";

export type LetterKind = "masuk" | "keluar";

export type Doc = {
  id: string;
  title: string;
  filename: string;
  rel_path: string;
  kind: LetterKind;
  size_bytes: number;
  sha256: string;
  added_at: string;
  nomor_surat: string | null;
  unit: string | null;
  asal_surat: string | null;
  disposisi: string | null;
};

let handle: Promise<Database> | null = null;

function db() {
  handle ??= Database.load("sqlite:kelola-arsip.db");
  return handle;
}

export async function listDocuments(): Promise<Doc[]> {
  const conn = await db();
  return conn.select<Doc[]>("SELECT * FROM documents ORDER BY added_at DESC");
}

export async function findByHash(sha256: string): Promise<Doc | null> {
  const conn = await db();
  const rows = await conn.select<Doc[]>(
    "SELECT * FROM documents WHERE sha256 = $1 LIMIT 1",
    [sha256],
  );
  return rows[0] ?? null;
}

export async function insertDocument(doc: Doc, ignoreConflicts = false): Promise<void> {
  const conn = await db();
  const verb = ignoreConflicts ? "INSERT OR IGNORE" : "INSERT";
  await conn.execute(
    `${verb} INTO documents (id, title, filename, rel_path, kind, size_bytes, sha256, added_at, nomor_surat, unit, asal_surat, disposisi) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      doc.id,
      doc.title,
      doc.filename,
      doc.rel_path,
      doc.kind,
      doc.size_bytes,
      doc.sha256,
      doc.added_at,
      doc.nomor_surat,
      doc.unit,
      doc.asal_surat,
      doc.disposisi,
    ],
  );
}

export async function deleteDocument(id: string): Promise<void> {
  const conn = await db();
  await conn.execute("DELETE FROM documents WHERE id = $1", [id]);
}

export async function updateDocument(doc: Doc): Promise<void> {
  const conn = await db();
  await conn.execute(
    "UPDATE documents SET title = $1, kind = $2, nomor_surat = $3, unit = $4, asal_surat = $5, disposisi = $6 WHERE id = $7",
    [
      doc.title,
      doc.kind,
      doc.nomor_surat,
      doc.unit,
      doc.asal_surat,
      doc.disposisi,
      doc.id,
    ],
  );
}
