import type { Doc } from "./db";
import { localDay } from "./format";

/** Letter date when known, otherwise the import date. */
export function docDay(doc: Doc): string {
  return doc.tanggal_surat || localDay(doc.added_at);
}

export function docMonth(doc: Doc): string {
  return docDay(doc).slice(0, 7);
}

/** Oldest letter first; ties keep the import order. */
export function sortByDate(docs: Doc[]): Doc[] {
  return [...docs].sort((a, b) => {
    const byDay = docDay(a).localeCompare(docDay(b));
    return byDay !== 0 ? byDay : a.added_at.localeCompare(b.added_at);
  });
}
