import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Doc } from "../lib/db";
import { formatDate } from "../lib/format";

type Props = {
  name: string;
  rows: Doc[];
  onClose: () => void;
};

const EMPTY = "—";

export default function BackupViewer({ name, rows, onClose }: Props) {
  const [query, setQuery] = useState("");

  // Oldest first so the row numbers follow the archive order of that backup.
  const ordered = useMemo(
    () => [...rows].sort((a, b) => a.added_at.localeCompare(b.added_at)),
    [rows],
  );

  const numbers = useMemo(() => {
    const map = new Map<string, number>();
    ordered.forEach((doc, index) => map.set(doc.id, index + 1));
    return map;
  }, [ordered]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return ordered;
    return ordered.filter(
      (doc) =>
        String(numbers.get(doc.id) ?? "").includes(term) ||
        doc.title.toLowerCase().includes(term) ||
        doc.filename.toLowerCase().includes(term),
    );
  }, [numbers, ordered, query]);

  return (
    <div className="animate-fade fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-viewer-title"
        className="animate-pop flex max-h-[85vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="min-w-0">
            <h2 id="backup-viewer-title" className="text-sm font-semibold text-slate-800">
              Isi Backup
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {name} · {rows.length} dokumen
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-6 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <label className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-500 focus-within:border-blue-400">
            <Search className="size-3.5" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari perihal / no..."
              className="w-48 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <p className="text-[11px] text-slate-400">{filtered.length} dokumen ditampilkan</p>
        </div>

        <div className="min-h-0 flex-1 overflow-auto border-t border-slate-100">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-slate-50/95 text-[11px] text-slate-500 backdrop-blur">
              <tr className="border-b border-slate-100">
                <th className="w-16 px-4 py-2.5 font-medium">No</th>
                <th className="px-3 py-2.5 font-medium">Tanggal Surat</th>
                <th className="px-3 py-2.5 font-medium">Nomor Surat</th>
                <th className="px-3 py-2.5 font-medium">Perihal Surat</th>
                <th className="px-3 py-2.5 font-medium">Asal / Kepada</th>
                <th className="px-3 py-2.5 font-medium">Bidang</th>
                <th className="px-4 py-2.5 font-medium">Disposisi / Pengolah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Tidak ada dokumen yang cocok.
                  </td>
                </tr>
              )}
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 text-slate-400">{numbers.get(doc.id)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">
                    {formatDate(doc.added_at)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">
                    {doc.nomor_surat || EMPTY}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-700">{doc.title}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400">
                      {doc.kind === "keluar" ? "Surat Keluar" : "Surat Masuk"}
                      {doc.filename ? ` · ${doc.filename}` : ""}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">
                    {doc.asal_surat || EMPTY}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">
                    {doc.unit || EMPTY}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{doc.disposisi || EMPTY}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
          <p className="text-[11px] text-slate-400">
            Hanya melihat isi backup. Data arsip tidak berubah.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
          >
            Tutup
          </button>
        </footer>
      </div>
    </div>
  );
}
