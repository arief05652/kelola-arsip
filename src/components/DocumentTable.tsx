import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  FolderSearch,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Doc } from "../lib/db";
import { formatDate, formatLetterDate } from "../lib/format";

type Props = {
  docs: Doc[];
  onOpen: (doc: Doc) => void;
  onRevealFile: (doc: Doc) => void;
  onSave: (doc: Doc) => void;
  onEdit: (doc: Doc) => void;
  onDelete: (doc: Doc) => void;
  onCopy: (doc: Doc, no: number) => void;
  emptyText: string;
  showBidang?: boolean;
  numbers?: Map<string, number>;
  sortDir?: "asc" | "desc" | null;
  onSortNomor?: (dir: "asc" | "desc") => void;
};

const EMPTY = "—";

const unitTone: Record<string, string> = {
  Sekretariat: "bg-blue-50 text-blue-600",
  "Bidang PIAK": "bg-amber-50 text-amber-600",
  "Bidang Yanminduk": "bg-emerald-50 text-emerald-600",
};

export default function DocumentTable({
  docs,
  onOpen,
  onRevealFile,
  onSave,
  onEdit,
  onDelete,
  onCopy,
  emptyText,
  showBidang = false,
  numbers,
  sortDir = null,
  onSortNomor,
}: Props) {
  const columns = showBidang ? 8 : 7;
  const [missing, setMissing] = useState<Set<string>>(new Set());

  // A row counts as having a file only when the PDF is really on disk.
  useEffect(() => {
    let cancelled = false;
    invoke<string[]>("existing_doc_files")
      .then((names) => {
        if (cancelled) return;
        const present = new Set(names);
        setMissing(
          new Set(
            docs.filter((doc) => !doc.rel_path || !present.has(doc.rel_path)).map((doc) => doc.id),
          ),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [docs]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/70 text-[11px] text-slate-500">
            <th className="w-16 px-4 py-2.5 font-medium">
              <span className="flex items-center gap-0.5">
                No
                {onSortNomor && (
                  <>
                    <button
                      type="button"
                      onClick={() => onSortNomor("asc")}
                      aria-label="Urutkan nomor surat dari terkecil"
                      title="Urutkan nomor surat: kecil ke besar"
                      className={`grid size-4 place-items-center rounded ${
                        sortDir === "asc"
                          ? "bg-blue-100 text-blue-600"
                          : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      }`}
                    >
                      <ChevronUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSortNomor("desc")}
                      aria-label="Urutkan nomor surat dari terbesar"
                      title="Urutkan nomor surat: besar ke kecil"
                      className={`grid size-4 place-items-center rounded ${
                        sortDir === "desc"
                          ? "bg-blue-100 text-blue-600"
                          : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      }`}
                    >
                      <ChevronDown className="size-3" />
                    </button>
                  </>
                )}
              </span>
            </th>
            <th className="px-3 py-2.5 font-medium">Tanggal Surat</th>
            <th className="px-3 py-2.5 font-medium">Nomor Surat</th>
            <th className="px-3 py-2.5 font-medium">Perihal Surat</th>
            <th className="px-3 py-2.5 font-medium">{showBidang ? "Kepada" : "Asal Surat"}</th>
            {showBidang && <th className="px-3 py-2.5 font-medium">Bidang</th>}
            <th className="px-3 py-2.5 font-medium">{showBidang ? "Pengolah" : "Disposisi"}</th>
            <th className="px-4 py-2.5 text-right font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {docs.length === 0 && (
            <tr>
              <td colSpan={columns} className="px-4 py-10 text-center text-slate-400">
                {emptyText}
              </td>
            </tr>
          )}
          {docs.map((doc, index) => (
            <tr key={doc.id} className="transition-colors hover:bg-slate-50/60">
              <td className="px-4 py-3 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span
                    title={missing.has(doc.id) ? "Tanpa file PDF" : "File PDF tersedia"}
                    aria-label={missing.has(doc.id) ? "Tanpa file PDF" : "File PDF tersedia"}
                    role="img"
                    className={`size-2 shrink-0 rounded-full ${
                      missing.has(doc.id) ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                  />
                  {numbers?.get(doc.id) ?? index + 1}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                {doc.tanggal_surat ? formatLetterDate(doc.tanggal_surat) : formatDate(doc.added_at)}
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
              <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                {doc.disposisi || EMPTY}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onOpen(doc)}
                    aria-label={`Buka ${doc.title}`}
                    title="Buka di aplikasi PDF"
                    className="grid size-6 place-items-center rounded-md bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
                  >
                    <Eye className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevealFile(doc)}
                    aria-label={`Tampilkan ${doc.title} di folder`}
                    title="Tampilkan di folder, lalu drag ke WhatsApp"
                    className="grid size-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 transition-colors hover:bg-indigo-100"
                  >
                    <FolderSearch className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSave(doc)}
                    aria-label={`Simpan salinan ${doc.title}`}
                    title="Simpan salinan"
                    className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100"
                  >
                    <Download className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopy(doc, numbers?.get(doc.id) ?? index + 1)}
                    aria-label={`Salin metadata ${doc.title}`}
                    title="Salin metadata"
                    className="grid size-6 place-items-center rounded-md bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                  >
                    <Copy className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(doc)}
                    aria-label={`Edit ${doc.title}`}
                    title="Edit data dokumen"
                    className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 transition-colors hover:bg-amber-100"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(doc)}
                    aria-label={`Hapus ${doc.title}`}
                    title="Hapus"
                    className="grid size-6 place-items-center rounded-md bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
