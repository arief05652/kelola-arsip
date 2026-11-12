import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Plus, Search } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { id as localeId } from "react-day-picker/locale";
import DocumentTable from "../components/DocumentTable";
import Pagination from "../components/Pagination";
import type { Doc, LetterKind } from "../lib/db";
import { docDay, sortByDate } from "../lib/docs";
import type { DocActions } from "../lib/types";

type Props = DocActions & {
  kind: LetterKind;
  docs: Doc[];
  unit?: string | null;
  onImport: () => void;
};

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const dayLabel = (date: Date) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);


export default function Letters({ kind, docs, unit = null, onImport, ...actions }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [range, setRange] = useState<DateRange | undefined>();
  const [draft, setDraft] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calendarOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setCalendarOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [calendarOpen]);

  const kindDocs = useMemo(
    () => sortByDate(docs.filter((doc) => doc.kind === kind)),
    [docs, kind],
  );

  const byKind = useMemo(
    () => (unit ? kindDocs.filter((doc) => doc.unit === unit) : kindDocs),
    [kindDocs, unit],
  );

  // Number = position in the archive order; it shifts when a row is deleted.
  const numbering = useMemo(() => {
    const map = new Map<string, number>();
    byKind.forEach((doc, index) => map.set(doc.id, index + 1));
    return map;
  }, [byKind]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const start = range?.from ? dayKey(range.from) : "";
    const end = range?.to ? dayKey(range.to) : "";
    const rows = byKind.filter((doc) => {
      const day = docDay(doc);
      if (start && day < start) return false;
      if (end && day > end) return false;
      if (!term) return true;
      if (String(numbering.get(doc.id) ?? "").includes(term)) return true;
      return doc.title.toLowerCase().includes(term) || doc.filename.toLowerCase().includes(term);
    });
    return sort === "desc" ? rows.reverse() : rows;
  }, [byKind, numbering, query, range, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const baseTitle = kind === "masuk" ? "Surat Masuk" : "Surat Keluar";
  const title = unit ? `${baseTitle} — ${unit}` : baseTitle;
  const searching = query.trim() !== "" || range?.from !== undefined;
  const rangeLabel = range?.from
    ? range.to
      ? `${dayLabel(range.from)} – ${dayLabel(range.to)}`
      : dayLabel(range.from)
    : "-";

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <p className="mt-1 text-xs text-slate-400">
            {filtered.length} dokumen ditampilkan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-500 focus-within:border-blue-400">
            <Search className="size-3.5" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari dokumen / no..."
              className="w-48 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>

          <div ref={pickerRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setDraft(range);
                setCalendarOpen((open) => !open);
              }}
              aria-expanded={calendarOpen}
              className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] transition-colors ${
                range?.from
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              <CalendarDays className="size-3.5 shrink-0" />
              <span className="whitespace-nowrap">{rangeLabel}</span>
              <ChevronDown
                className={`size-3 shrink-0 transition-transform ${calendarOpen ? "rotate-180" : ""}`}
              />
            </button>

            {calendarOpen && (
              <div className="animate-pop absolute right-0 top-full z-30 mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <DayPicker
                  mode="range"
                  selected={draft}
                  onSelect={setDraft}
                  numberOfMonths={2}
                  locale={localeId}
                  defaultMonth={draft?.from ?? range?.from ?? new Date()}
                />
                <div className="mt-1 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-[11px]">
                  <span className="text-slate-400">Pilih tanggal awal lalu tanggal akhir.</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRange(undefined);
                        setDraft(undefined);
                        setCalendarOpen(false);
                      }}
                      className="rounded-md px-2 py-1 font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      disabled={!draft?.from}
                      onClick={() => {
                        setRange(draft);
                        setCalendarOpen(false);
                      }}
                      className="rounded-md bg-blue-600 px-3 py-1 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onImport}
            className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-600"
          >
            <Plus className="size-3.5" />
            Tambah
          </button>
        </div>
      </header>

      <DocumentTable
        docs={visible}
        numbers={numbering}
        showBidang={kind === "keluar"}
        sortDir={sort}
        onSortNomor={setSort}
        emptyText={
          searching
            ? "Tidak ada dokumen yang cocok dengan pencarian."
            : unit
              ? `Belum ada surat keluar untuk ${unit}.`
              : `Belum ada ${baseTitle.toLowerCase()}. Klik Tambah untuk mengimpor PDF.`
        }
        {...actions}
      />

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
    </section>
  );
}
