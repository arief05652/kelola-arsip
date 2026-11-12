import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  shown: number;
  total: number;
  start: number;
  pageSize?: number;
  onPageSize?: (size: number) => void;
  sizes?: number[];
};

const SIZES = [10, 25, 50, 100];

export default function Pagination({
  page,
  pageCount,
  onPage,
  shown,
  total,
  start,
  pageSize,
  onPageSize,
  sizes = SIZES,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
      <div className="flex items-center gap-2">
        {onPageSize && (
          <label className="flex items-center gap-1.5">
            Tampilkan
            <select
              value={pageSize}
              onChange={(event) => onPageSize(Number(event.target.value))}
              aria-label="Jumlah baris per halaman"
              className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-700 outline-none focus:border-blue-400"
            >
              {sizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            baris
          </label>
        )}
        <span className="text-slate-400">
          {total === 0 ? "0 dokumen" : `${start}–${start + shown - 1} dari ${total}`}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
          className="grid size-6 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="px-1.5 font-medium text-slate-600">
          Halaman {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          aria-label="Halaman berikutnya"
          className="grid size-6 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
