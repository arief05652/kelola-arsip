import type { Doc } from "./db";
import { monthKey, monthLabel } from "./format";

export type MonthBucket = {
  key: string;
  label: string;
  masuk: number;
  keluar: number;
};

export function countByKind(docs: Doc[], kind: Doc["kind"]): number {
  return docs.filter((doc) => doc.kind === kind).length;
}

export function countThisMonth(docs: Doc[]): number {
  const key = monthKey(new Date());
  return docs.filter((doc) => doc.added_at.slice(0, 7) === key).length;
}

export function totalBytes(docs: Doc[]): number {
  return docs.reduce((sum, doc) => sum + doc.size_bytes, 0);
}

export function yearSeries(docs: Doc[], year = new Date().getFullYear()): MonthBucket[] {
  const buckets: MonthBucket[] = [];

  for (let month = 0; month < 12; month += 1) {
    const date = new Date(year, month, 1);
    buckets.push({
      key: monthKey(date),
      label: monthLabel(date),
      masuk: 0,
      keluar: 0,
    });
  }

  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const doc of docs) {
    const bucket = byKey.get(doc.added_at.slice(0, 7));
    if (bucket) bucket[doc.kind] += 1;
  }

  return buckets;
}

export function monthSeries(docs: Doc[], months: number): MonthBucket[] {
  const now = new Date();
  const buckets: MonthBucket[] = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: monthKey(date),
      label: monthLabel(date),
      masuk: 0,
      keluar: 0,
    });
  }

  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const doc of docs) {
    const bucket = byKey.get(doc.added_at.slice(0, 7));
    if (bucket) bucket[doc.kind] += 1;
  }

  return buckets;
}
