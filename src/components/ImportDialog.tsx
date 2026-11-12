import { useEffect, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { insertDocument, updateDocument, type Doc, type LetterKind } from "../lib/db";
import { importLetter, replaceDocumentFile } from "../lib/documents";

type Props = {
  defaultKind: LetterKind;
  defaultUnit?: string;
  doc?: Doc;
  onClose: () => void;
  onImported: (message: string) => void;
};

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function isPdf(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf");
}

export default function ImportDialog({
  defaultKind,
  defaultUnit,
  doc,
  onClose,
  onImported,
}: Props) {
  const editing = Boolean(doc);
  const [title, setTitle] = useState(doc?.title ?? "");
  const [nomorSurat, setNomorSurat] = useState(doc?.nomor_surat ?? "");
  const [kind, setKind] = useState<LetterKind>(doc?.kind ?? defaultKind);
  const [unit, setUnit] = useState(doc?.unit ?? defaultUnit ?? "");
  const [asalSurat, setAsalSurat] = useState(doc?.asal_surat ?? "");
  const [disposisi, setDisposisi] = useState(doc?.disposisi ?? "");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tauri intercepts OS drag-and-drop, so the HTML5 drop event never fires.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "drop") {
          setDragging(false);
          const dropped = event.payload.paths.find(isPdf);
          if (dropped) {
            setFilePath(dropped);
            setError(null);
            setTitle((current) => current || baseName(dropped).replace(/\.pdf$/i, ""));
          } else {
            setError("Hanya file PDF yang didukung");
          }
        } else if (event.payload.type === "leave") {
          setDragging(false);
        } else {
          setDragging(true);
        }
      })
      .then((stop) => {
        unlisten = stop;
      })
      .catch(() => undefined);
    return () => unlisten?.();
  }, []);

  async function chooseFile() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Dokumen PDF", extensions: ["pdf"] }],
    });
    if (typeof selected !== "string") return;
    setFilePath(selected);
    setError(null);
    setTitle((current) => current || baseName(selected).replace(/\.pdf$/i, ""));
  }

  async function submit() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (doc) {
        let fileNote = "";
        if (filePath) {
          const result = await replaceDocumentFile(doc, filePath);
          if (result === "duplicate") {
            setError("File ini sudah ada di arsip");
            setSaving(false);
            return;
          }
          if (result === "replaced") fileNote = " dan file PDF";
        }
        await updateDocument({
          ...doc,
          title: title.trim() || doc.title,
          kind,
          nomor_surat: nomorSurat.trim() || null,
          unit: unit.trim() || null,
          asal_surat: asalSurat.trim() || null,
          disposisi: disposisi.trim() || null,
        });
        onImported(`Perubahan dokumen${fileNote} disimpan`);
        onClose();
        return;
      }
      if (!filePath) {
        // Metadata-only row: the PDF can be attached later through Edit.
        const id = `dok-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        await insertDocument({
          id,
          title: title.trim() || "Dokumen tanpa file",
          filename: "",
          rel_path: "",
          kind,
          size_bytes: 0,
          sha256: `no-file:${id}`,
          added_at: new Date().toISOString(),
          nomor_surat: nomorSurat.trim() || null,
          unit: unit.trim() || null,
          asal_surat: asalSurat.trim() || null,
          disposisi: disposisi.trim() || null,
        });
        onImported("Dokumen ditambahkan tanpa file PDF");
        onClose();
        return;
      }
      const result = await importLetter({
        path: filePath,
        title,
        nomorSurat,
        unit,
        asalSurat,
        disposisi,
        kind,
      });
      onImported(
        result === "skipped"
          ? "Dokumen ini sudah ada di arsip"
          : "Dokumen berhasil ditambahkan",
      );
      onClose();
    } catch (cause) {
      setError(`Gagal menyimpan: ${String(cause)}`);
      setSaving(false);
    }
  }

  const fileName = filePath ? baseName(filePath) : null;

  return (
    <div className="animate-fade fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
        className="animate-pop w-full max-w-md rounded-xl bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 id="import-dialog-title" className="text-sm font-semibold text-slate-800">
            {editing ? "Edit Dokumen" : "Tambah Dokumen"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-3 px-5 py-4">
          <label className="block">
            <span className="text-[11px] font-medium text-slate-500">Perihal Surat</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Judul dokumen"
              autoFocus
              className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-medium text-slate-500">Kategori</span>
              <select
                value={kind}
                onChange={(event) => {
                  const next = event.target.value as LetterKind;
                  setKind(next);
                  if (next === "masuk") {
                    setUnit("");
                  }
                }}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
              >
                <option value="masuk">Surat Masuk</option>
                <option value="keluar">Surat Keluar</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-slate-500">Nomor Surat</span>
              <input
                value={nomorSurat}
                onChange={(event) => setNomorSurat(event.target.value)}
                placeholder="cth. 012/KS/2026"
                className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {kind === "keluar" && (
              <label className="block">
                <span className="text-[11px] font-medium text-slate-500">Bidang / Unit</span>
                <select
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="">Pilih bidang</option>
                  <option value="Sekretariat">Sekretariat</option>
                  <option value="Bidang PIAK">Bidang PIAK</option>
                  <option value="Bidang Yanminduk">Bidang Yanminduk</option>
                </select>
              </label>
            )}

            <label className={kind === "keluar" ? "block" : "col-span-2 block"}>
              <span className="text-[11px] font-medium text-slate-500">
                {kind === "keluar" ? "Kepada" : "Asal Surat"}
              </span>
              <input
                value={asalSurat}
                onChange={(event) => setAsalSurat(event.target.value)}
                placeholder="cth. Dinas Pendidikan"
                className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-medium text-slate-500">
              {kind === "keluar" ? "Pengolah" : "Disposisi"}
            </span>
            <input
              value={disposisi}
              onChange={(event) => setDisposisi(event.target.value)}
              placeholder={kind === "keluar" ? "cth. Nama pengolah" : "cth. Tindak lanjuti"}
              className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400"
            />
          </label>

          <div>
            <span className="text-[11px] font-medium text-slate-500">
              File PDF
              <span className="ml-1 font-normal text-slate-400">
                {editing ? "(biarkan kosong untuk tetap pakai file lama)" : "(opsional)"}
              </span>
            </span>
            <div className="relative mt-1">
              <button
                type="button"
                onClick={chooseFile}
                className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
                  dragging
                    ? "border-blue-400 bg-blue-50"
                    : "border-slate-300 bg-slate-50/60 hover:border-blue-300 hover:bg-blue-50/40"
                }`}
              >
                {fileName ? (
                  <>
                    <FileText className="size-5 text-blue-500" />
                    <span className="max-w-full truncate pr-6 text-xs font-medium text-slate-700">
                      {fileName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Klik untuk memilih file lain, atau X untuk menghapus
                    </span>
                  </>
                ) : editing && doc ? (
                  <>
                    <FileText className="size-5 text-blue-500" />
                    <span className="max-w-full truncate text-xs font-medium text-slate-700">
                      {doc.filename || "Belum ada file PDF"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Klik atau tarik PDF untuk{" "}
                      {doc.filename ? "mengganti file" : "melampirkan file"}
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="size-5 text-slate-400" />
                    <span className="text-xs font-medium text-slate-600">
                      Tarik file PDF ke sini
                    </span>
                    <span className="text-[10px] text-slate-400">
                      atau klik untuk membuka file manager
                    </span>
                  </>
                )}
              </button>
              {fileName && (
                <button
                  type="button"
                  onClick={() => {
                    setFilePath(null);
                    setError(null);
                  }}
                  aria-label="Hapus file terpilih"
                  title="Hapus file terpilih"
                  className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-rose-100 text-rose-600 transition-colors hover:bg-rose-200"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-[11px] text-rose-500">{error}</p>}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </footer>
      </div>
    </div>
  );
}
