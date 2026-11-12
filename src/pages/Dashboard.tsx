import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import ActivityFeed from "../components/ActivityFeed";
import DocumentTable from "../components/DocumentTable";
import Pagination from "../components/Pagination";
import StatCards from "../components/StatCards";
import VolumeChart from "../components/VolumeChart";
import type { Doc } from "../lib/db";
import { sortByDate } from "../lib/docs";
import type { DocActions } from "../lib/types";

type Props = DocActions & {
  docs: Doc[];
  onSeeAll: () => void;
};

export default function Dashboard({ docs, onSeeAll, ...actions }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const masukDocs = useMemo(
    () => sortByDate(docs.filter((doc) => doc.kind === "masuk")),
    [docs],
  );
  const numbering = useMemo(() => {
    const map = new Map<string, number>();
    masukDocs.forEach((doc, index) => map.set(doc.id, index + 1));
    return map;
  }, [masukDocs]);

  // Newest first, like the activity feed; numbers still match Surat Masuk.
  const newest = useMemo(() => [...masukDocs].reverse(), [masukDocs]);
  const pageCount = Math.max(1, Math.ceil(newest.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = newest.slice((safePage - 1) * pageSize, safePage * pageSize);

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
                {masukDocs.length} surat masuk
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
            docs={visible}
            numbers={numbering}
            emptyText="Belum ada surat masuk. Klik Tambah Dokumen untuk mengimpor PDF."
            {...actions}
          />
          <Pagination
            page={safePage}
            pageCount={pageCount}
            onPage={setPage}
            shown={visible.length}
            total={newest.length}
            start={(safePage - 1) * pageSize + 1}
            pageSize={pageSize}
            onPageSize={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </section>

        <ActivityFeed docs={docs} />
      </div>
    </div>
  );
}
