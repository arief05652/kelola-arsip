import { ArrowRight } from "lucide-react";
import ActivityFeed from "../components/ActivityFeed";
import DocumentTable from "../components/DocumentTable";
import StatCards from "../components/StatCards";
import VolumeChart from "../components/VolumeChart";
import type { Doc } from "../lib/db";
import type { DocActions } from "../lib/types";

type Props = DocActions & {
  docs: Doc[];
  onSeeAll: () => void;
};

export default function Dashboard({ docs, onSeeAll, ...actions }: Props) {
  const recent = docs.filter((doc) => doc.kind === "masuk").slice(0, 5);

  return (
    <div className="space-y-4">
      <StatCards docs={docs} />
      <VolumeChart docs={docs} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <header className="flex items-center justify-between gap-3 p-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Surat Masuk Terbaru</h2>
              <p className="mt-1 text-xs text-slate-400">
                {recent.length} dari {docs.filter((doc) => doc.kind === "masuk").length} surat masuk
              </p>
            </div>
            <button
              type="button"
              onClick={onSeeAll}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
            >
              Lihat Semua
              <ArrowRight className="size-3.5" />
            </button>
          </header>
          <DocumentTable
            docs={recent}
            emptyText="Belum ada surat masuk. Klik Tambah Dokumen untuk mengimpor PDF."
            {...actions}
          />
        </section>

        <ActivityFeed docs={docs} />
      </div>
    </div>
  );
}
