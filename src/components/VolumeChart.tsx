import type { Doc } from "../lib/db";
import { monthSeries } from "../lib/stats";

function Bar({
  value,
  max,
  gradient,
  delay,
}: {
  value: number;
  max: number;
  gradient: string;
  delay: number;
}) {
  const height = max === 0 ? 0 : Math.max(4, Math.round((value / max) * 100));
  return (
    <div
      className={`animate-bar w-3 rounded-t-full ${gradient}`}
      style={{ height: `${height}%`, animationDelay: `${delay}ms` }}
    />
  );
}

export default function VolumeChart({ docs }: { docs: Doc[] }) {
  const series = monthSeries(docs, 10);
  const max = Math.max(1, ...series.flatMap((point) => [point.masuk, point.keluar]));
  const empty = series.every((point) => point.masuk === 0 && point.keluar === 0);
  const totals = series.reduce(
    (acc, point) => ({
      masuk: acc.masuk + point.masuk,
      keluar: acc.keluar + point.keluar,
    }),
    { masuk: 0, keluar: 0 },
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Grafik Volume Surat</h2>
          <p className="mt-1 text-xs text-slate-400">
            Perbandingan surat masuk dan keluar per bulan
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
            {new Date().getFullYear()}
          </span>
          <span className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
            <span className="size-2 rounded-full bg-gradient-to-t from-blue-600 to-sky-400" />
            Masuk
            <span className="font-semibold">{totals.masuk}</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
            <span className="size-2 rounded-full bg-gradient-to-t from-amber-500 to-orange-300" />
            Keluar
            <span className="font-semibold">{totals.keluar}</span>
          </span>
        </div>
      </header>

      <div className="relative mt-6 h-44">
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((line) => (
            <div key={line} className="border-t border-slate-100" />
          ))}
        </div>

        {empty && (
          <p className="absolute inset-0 grid place-items-center text-xs text-slate-400">
            Belum ada dokumen untuk ditampilkan
          </p>
        )}

        <div className="relative grid h-full grid-cols-10 gap-1">
          {series.map((point) => (
            <div
              key={point.key}
              className="group/col relative flex h-full items-end justify-center gap-1.5 rounded-lg transition-colors hover:bg-slate-50/80"
            >
              <span className="pointer-events-none absolute top-0 left-1/2 z-10 -translate-x-1/2 rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover/col:opacity-100">
                {point.masuk} / {point.keluar}
              </span>
              <Bar
                value={point.masuk}
                max={max}
                gradient="bg-gradient-to-t from-blue-600 to-sky-400"
                delay={0}
              />
              <Bar
                value={point.keluar}
                max={max}
                gradient="bg-gradient-to-t from-amber-500 to-orange-300"
                delay={60}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-10 gap-1">
        {series.map((point) => (
          <span key={point.key} className="text-center text-[10px] text-slate-400">
            {point.label}
          </span>
        ))}
      </div>
    </section>
  );
}
