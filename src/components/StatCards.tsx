import {
  CalendarCheck,
  FileText,
  HardDrive,
  Inbox,
  Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Doc } from "../lib/db";
import { formatBytes } from "../lib/format";
import { countByKind, countThisMonth, totalBytes } from "../lib/stats";

type Tone = "blue" | "amber" | "violet" | "emerald" | "slate";

type Stat = {
  label: string;
  value: string;
  note: string;
  tone: Tone;
  icon: LucideIcon;
};

const tones: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-500",
  amber: "bg-amber-50 text-amber-500",
  violet: "bg-violet-50 text-violet-500",
  emerald: "bg-emerald-50 text-emerald-500",
  slate: "bg-slate-100 text-slate-500",
};

export default function StatCards({ docs }: { docs: Doc[] }) {
  const thisMonth = countThisMonth(docs);
  const stats: Stat[] = [
    {
      label: "Surat Masuk",
      value: String(countByKind(docs, "masuk")),
      note: `${thisMonth} dokumen bulan ini`,
      tone: "blue",
      icon: Inbox,
    },
    {
      label: "Surat Keluar",
      value: String(countByKind(docs, "keluar")),
      note: `${thisMonth} dokumen bulan ini`,
      tone: "amber",
      icon: Send,
    },
    {
      label: "Total Dokumen",
      value: String(docs.length),
      note: `${docs.length} file tersimpan`,
      tone: "violet",
      icon: FileText,
    },
    {
      label: "Bulan Ini",
      value: String(thisMonth),
      note: "dokumen ditambahkan",
      tone: "emerald",
      icon: CalendarCheck,
    },
    {
      label: "Ukuran Arsip",
      value: formatBytes(totalBytes(docs)),
      note: "total penyimpanan",
      tone: "slate",
      icon: HardDrive,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          style={{ animationDelay: `${index * 40}ms` }}
          className="animate-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-slate-500">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {stat.value}
              </p>
            </div>
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-lg ${tones[stat.tone]}`}
            >
              <stat.icon className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-[11px] font-medium text-slate-400">{stat.note}</p>
        </div>
      ))}
    </div>
  );
}
