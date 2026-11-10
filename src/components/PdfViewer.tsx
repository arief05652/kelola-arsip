import { useCallback, useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus, X } from "lucide-react";
import type { Doc } from "../lib/db";
import { readDocument } from "../lib/documents";

GlobalWorkerOptions.workerSrc = workerSrc;

type Props = {
  doc: Doc;
  onClose: () => void;
};

type PageProps = {
  pdf: PDFDocumentProxy;
  number: number;
  zoom: number;
  register: (number: number, element: HTMLDivElement | null) => void;
};

const ZOOM_STEP = 0.2;
// A4 at 96 dpi, used only as a placeholder size until the page is rendered.
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

function PdfPage({ pdf, number, zoom, register }: PageProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);

  // Render lazily: a page is only drawn once it gets near the viewport.
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root: element.closest("[data-pdf-scroll]"), rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;

    (async () => {
      try {
        const pdfPage = await pdf.getPage(number);
        if (cancelled) return;
        const ratio = window.devicePixelRatio || 1;
        const viewport = pdfPage.getViewport({ scale: zoom * ratio });
        const context = canvas.getContext("2d");
        if (!context) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / ratio}px`;
        canvas.style.height = `${viewport.height / ratio}px`;
        task = pdfPage.render({ canvasContext: context, viewport, canvas });
        await task.promise;
        if (!cancelled) setRendered(true);
      } catch (cause) {
        if (!cancelled && (cause as { name?: string })?.name !== "RenderingCancelledException") {
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, pdf, number, zoom]);

  return (
    <div
      ref={(element) => {
        wrapperRef.current = element;
        register(number, element);
      }}
      className="flex flex-col items-center gap-1.5"
    >
      {!rendered && (
        <div
          className="max-w-full rounded bg-white shadow-sm"
          style={{ width: A4_WIDTH * zoom, height: A4_HEIGHT * zoom }}
        />
      )}
      <canvas
        ref={canvasRef}
        className={rendered && !failed ? "rounded bg-white shadow-sm" : "hidden"}
      />
      {failed && (
        <p className="rounded-lg bg-white px-4 py-6 text-xs text-rose-500">
          Gagal menampilkan halaman {number}
        </p>
      )}
      <span className="text-[10px] font-medium text-slate-400">Halaman {number}</span>
    </div>
  );
}

export default function PdfViewer({ doc, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageElements = useRef<Array<HTMLDivElement | null>>([]);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof getDocument> | null = null;

    setPdf(null);
    setPages(0);
    setPage(1);
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await readDocument(doc);
        if (cancelled) return;
        task = getDocument({ data });
        const loaded = await task.promise;
        if (cancelled) return;
        setPdf(loaded);
        setPages(loaded.numPages);
        setLoading(false);
      } catch (cause) {
        if (cancelled) return;
        setError(`Gagal membuka PDF: ${String(cause)}`);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [doc]);

  const register = useCallback((number: number, element: HTMLDivElement | null) => {
    pageElements.current[number - 1] = element;
  }, []);

  const goTo = useCallback(
    (target: number) => {
      const clamped = Math.min(Math.max(1, target), pages || 1);
      pageElements.current[clamped - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [pages],
  );

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const top = container.getBoundingClientRect().top;
    let current = 1;
    pageElements.current.forEach((element, index) => {
      if (element && element.getBoundingClientRect().top - top <= 80) current = index + 1;
    });
    setPage(current);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goTo(page - 1);
      if (event.key === "ArrowRight") goTo(page + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, onClose, page]);

  return (
    <div className="animate-fade fixed inset-0 z-50 flex flex-col bg-slate-900/80 p-4">
      <div className="animate-pop mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col rounded-xl bg-white shadow-xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-800">{doc.title}</p>
            <p className="truncate text-[10px] text-slate-400">{doc.filename}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => goTo(page - 1)}
              disabled={page <= 1 || loading}
              aria-label="Halaman sebelumnya"
              className="grid size-7 place-items-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-16 text-center text-[11px] text-slate-500">
              {loading ? "..." : `${page} / ${pages}`}
            </span>
            <button
              type="button"
              onClick={() => goTo(page + 1)}
              disabled={page >= pages || loading}
              aria-label="Halaman berikutnya"
              className="grid size-7 place-items-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>

            <span className="mx-1 h-5 w-px bg-slate-200" />

            <button
              type="button"
              onClick={() => setZoom((current) => Math.max(0.4, current - ZOOM_STEP))}
              disabled={loading}
              aria-label="Perkecil"
              className="grid size-7 place-items-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-10 text-center text-[11px] text-slate-500">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((current) => Math.min(3, current + ZOOM_STEP))}
              disabled={loading}
              aria-label="Perbesar"
              className="grid size-7 place-items-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="ml-1 grid size-7 place-items-center rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div
          ref={scrollRef}
          data-pdf-scroll
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4"
        >
          {loading && (
            <div className="grid h-full place-items-center">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          )}
          {error && (
            <p className="mx-auto max-w-md rounded-lg bg-white p-4 text-center text-xs text-rose-500">
              {error}
            </p>
          )}
          {pdf && (
            <div className="mx-auto flex w-fit flex-col gap-4">
              {Array.from({ length: pages }, (_, index) => (
                <PdfPage
                  key={index + 1}
                  pdf={pdf}
                  number={index + 1}
                  zoom={zoom}
                  register={register}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
