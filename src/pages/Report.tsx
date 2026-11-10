import { Download, Loader2, Upload } from "lucide-react";
import type { Doc } from "../lib/db";
import { formatBytes } from "../lib/format";
import { countByKind, monthSeries, totalBytes } from "../lib/stats";

const longLabel = (key: string) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
    new Date(`${key}-01T00:00:00`),
  );

type Props = {
  docs: Doc[];
  busy: boolean;
  onBackup: () => void;
  onRestore: () => void;
};

export default function Report({ docs, busy, onBackup, onRestore }: Props) {
  const rows = monthSeries(docs, 12)
    .map((bucket) => ({
      ...bucket,
      label: longLabel(bucket.key),
      total: bucket.masuk + bucket.keluar,
    }))
    .reverse();

  const totals = rows.reduce(
    (acc, row) => ({
      masuk: acc.masuk + row.masuk,
      keluar: acc.keluar + row.keluar,
      total: acc.total + row.total,
    }),
    { masuk: 0, keluar: 0, total: 0 },
  );

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Backup &amp; Pemulihan</h2>
          <p className="mt-1 text-xs text-slate-400">
            Menyalin seluruh metadata dan file PDF ke satu file ZIP. File asli tetap di tempatnya,
            jadi arsip tetap utuh setelah backup.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackup}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Backup
          </button>
          <button
            type="button"
            onClick={onRestore}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="size-3.5" />
            Pulihkan
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Surat Masuk", value: String(countByKind(docs, "masuk")) },
          { label: "Surat Keluar", value: String(countByKind(docs, "keluar")) },
          { label: "Total Penyimpanan", value: formatBytes(totalBytes(docs)) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="p-4">
          <h2 className="text-sm font-semibold text-slate-800">Laporan 12 Bulan Terakhir</h2>
          <p className="mt-1 text-xs text-slate-400">
            Jumlah dokumen yang diimpor per bulan
          </p>
        </header>

        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/70 text-[11px] text-slate-500">
              <th className="px-4 py-2.5 font-medium">Bulan</th>
              <th className="px-3 py-2.5 font-medium">Surat Masuk</th>
              <th className="px-3 py-2.5 font-medium">Surat Keluar</th>
              <th className="px-4 py-2.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-slate-50/60">
                <td className="px-4 py-2.5 capitalize text-slate-600">{row.label}</td>
                <td className="px-3 py-2.5 text-slate-500">{row.masuk}</td>
                <td className="px-3 py-2.5 text-slate-500">{row.keluar}</td>
                <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50/70 font-semibold text-slate-700">
              <td className="px-4 py-2.5">Total</td>
              <td className="px-3 py-2.5">{totals.masuk}</td>
              <td className="px-3 py-2.5">{totals.keluar}</td>
              <td className="px-4 py-2.5 text-right">{totals.total}</td>
            </tr>
          </tfoot>
        </table>
      </section>
    </div>
  );
}
