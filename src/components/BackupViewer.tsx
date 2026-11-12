import { useMemo, useState } from "react";
import { Copy, Search, X } from "lucide-react";
import type { Doc } from "../lib/db";
import { sortByDate } from "../lib/docs";
import { formatDate, formatLetterDate } from "../lib/format";
import Pagination from "./Pagination";

type Props = {
  name: string;
  rows: Doc[];
  onCopy: (doc: Doc, no: number) => void;
  onClose: () => void;
};

const EMPTY = "—";

const unitTone: Record<string, string> = {
  Sekretariat: "bg-blue-50 text-blue-600",
  "Bidang PIAK": "bg-amber-50 text-amber-600",
  "Bidang Yanminduk": "bg-emerald-50 text-emerald-600",
};

const KINDS = [
  { value: "masuk", label: "Surat Masuk" },
  { value: "keluar", label: "Surat Keluar" },
] as const;

type KindFilter = (typeof KINDS)[number]["value"];

export default function BackupViewer({ name, rows, onCopy, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("masuk");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Oldest first; each kind has its own numbering cycle.
  const ordered = useMemo(() => sortByDate(rows), [rows]);
  const numbers = useMemo(() => {
    const map = new Map<string, number>();
    let masuk = 0;
    let keluar = 0;
    ordered.forEach((doc) => {
      map.set(doc.id, doc.kind === "keluar" ? ++keluar : ++masuk);
    });
    return map;
  }, [ordered]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rows = ordered.filter((doc) => doc.kind === kind);
    if (!term) return rows;
    return rows.filter(
      (doc) =>
        String(numbers.get(doc.id) ?? "").includes(term) ||
        doc.title.toLowerCase().includes(term) ||
        doc.filename.toLowerCase().includes(term),
    );
  }, [kind, numbers, ordered, query]);

  const showBidang = kind === "keluar";

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

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
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-500 focus-within:border-blue-400">
              <Search className="size-3.5" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Cari perihal / no..."
                className="w-48 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5">
              {KINDS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setKind(option.value);
                    setPage(1);
                  }}
                  aria-pressed={kind === option.value}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    kind === option.value
                      ? "bg-white text-slate-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-400">{filtered.length} dokumen ditampilkan</p>
        </div>

        <div className="min-h-0 flex-1 overflow-auto border-t border-slate-100">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-slate-50/95 text-[11px] text-slate-500 backdrop-blur">
              <tr className="border-y border-slate-100">
                <th className="w-16 px-4 py-2.5 font-medium">No</th>
                <th className="px-3 py-2.5 font-medium">Tanggal Surat</th>
                <th className="px-3 py-2.5 font-medium">Nomor Surat</th>
                <th className="px-3 py-2.5 font-medium">Perihal Surat</th>
                <th className="px-3 py-2.5 font-medium">{showBidang ? "Kepada" : "Asal Surat"}</th>
                {showBidang && <th className="px-3 py-2.5 font-medium">Bidang</th>}
                <th className="px-4 py-2.5 font-medium">{showBidang ? "Pengolah" : "Disposisi"}</th>
                <th className="px-4 py-2.5 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={showBidang ? 8 : 7}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Tidak ada dokumen yang cocok.
                  </td>
                </tr>
              )}
              {visible.map((doc) => (
                <tr key={doc.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-400">{numbers.get(doc.id)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                    {doc.tanggal_surat
                      ? formatLetterDate(doc.tanggal_surat)
                      : formatDate(doc.added_at)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                    {doc.nomor_surat || EMPTY}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-700">{doc.title}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400">{doc.filename}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                    {doc.asal_surat || EMPTY}
                  </td>
                  {showBidang && (
                    <td className="whitespace-nowrap px-3 py-3">
                      {doc.unit ? (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            unitTone[doc.unit] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {doc.unit}
                        </span>
                      ) : (
                        <span className="text-slate-500">{EMPTY}</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-500">{doc.disposisi || EMPTY}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => onCopy(doc, numbers.get(doc.id) ?? 0)}
                        aria-label={`Salin metadata ${doc.title}`}
                        title="Salin metadata"
                        className="grid size-6 place-items-center rounded-md bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={safePage}
          pageCount={pageCount}
          onPage={setPage}
          shown={visible.length}
          total={filtered.length}
          start={(safePage - 1) * pageSize + 1}
          pageSize={pageSize}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />

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
