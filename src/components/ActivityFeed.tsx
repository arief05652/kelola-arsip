import { Inbox, Send } from "lucide-react";
import type { Doc } from "../lib/db";
import { timeAgo } from "../lib/format";

export default function ActivityFeed({ docs }: { docs: Doc[] }) {
  const recent = docs.slice(0, 5);

  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="p-4">
        <h2 className="text-sm font-semibold text-slate-800">Aktivitas Terbaru</h2>
        <p className="mt-1 text-xs text-slate-400">Dokumen yang baru ditambahkan</p>
      </header>

      {recent.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-slate-400">
          Belum ada aktivitas. Tambahkan dokumen untuk memulai.
        </p>
      ) : (
        <ul className="flex-1 space-y-4 px-4 pb-4">
          {recent.map((doc) => {
            const isMasuk = doc.kind === "masuk";
            const Icon = isMasuk ? Inbox : Send;
            return (
              <li key={doc.id} className="flex gap-3">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                    isMasuk
                      ? "bg-blue-50 text-blue-500"
                      : "bg-amber-50 text-amber-500"
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium leading-snug text-slate-700">
                    {isMasuk ? "Surat masuk ditambahkan" : "Surat keluar ditambahkan"}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-400">{doc.title}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo(doc.added_at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
