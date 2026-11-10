import { Download, Eye, Pencil, Trash2 } from "lucide-react";
import type { Doc } from "../lib/db";
import { formatDate } from "../lib/format";

type Props = {
  docs: Doc[];
  onOpen: (doc: Doc) => void;
  onSave: (doc: Doc) => void;
  onEdit: (doc: Doc) => void;
  onDelete: (doc: Doc) => void;
  emptyText: string;
  showBidang?: boolean;
};

const EMPTY = "—";

const unitTone: Record<string, string> = {
  Sekretaris: "bg-blue-50 text-blue-600",
  "Bidang PIAK": "bg-amber-50 text-amber-600",
  "Bidang Yanminduk": "bg-emerald-50 text-emerald-600",
};

export default function DocumentTable({
  docs,
  onOpen,
  onSave,
  onEdit,
  onDelete,
  emptyText,
  showBidang = false,
}: Props) {
  const columns = showBidang ? 8 : 7;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/70 text-[11px] text-slate-500">
            <th className="w-12 px-4 py-2.5 font-medium">No</th>
            <th className="px-3 py-2.5 font-medium">Tanggal Surat</th>
            <th className="px-3 py-2.5 font-medium">Nomor Surat</th>
            <th className="px-3 py-2.5 font-medium">Perihal Surat</th>
            <th className="px-3 py-2.5 font-medium">Asal Surat</th>
            {showBidang && <th className="px-3 py-2.5 font-medium">Bidang</th>}
            <th className="px-3 py-2.5 font-medium">Disposisi</th>
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
              <td className="px-4 py-3 text-slate-400">{index + 1}</td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                {formatDate(doc.added_at)}
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
                    onClick={() => onSave(doc)}
                    aria-label={`Simpan salinan ${doc.title}`}
                    title="Simpan salinan"
                    className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100"
                  >
                    <Download className="size-3.5" />
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
