import { expect, test } from "bun:test";
import type { Doc } from "../src/lib/db";
import { docDay, sortByDate } from "../src/lib/docs";
import { yearSeries } from "../src/lib/stats";

function doc(overrides: Partial<Doc>): Doc {
  return {
    id: "d1",
    title: "Surat",
    filename: "a.pdf",
    rel_path: "a.pdf",
    kind: "masuk",
    size_bytes: 1,
    sha256: "x",
    added_at: "2026-01-01T00:00:00Z",
    nomor_surat: null,
    unit: null,
    asal_surat: null,
    disposisi: null,
    tanggal_surat: null,
    ...overrides,
  };
}

test("docDay prefers the letter date", () => {
  expect(docDay(doc({ tanggal_surat: "2026-03-04" }))).toBe("2026-03-04");
});

test("sortByDate orders by letter date", () => {
  const sorted = sortByDate([
    doc({ id: "late", tanggal_surat: "2026-05-01" }),
    doc({ id: "early", tanggal_surat: "2026-01-01" }),
  ]);
  expect(sorted.map((row) => row.id)).toEqual(["early", "late"]);
});

test("yearSeries buckets by the letter date month", () => {
  const rows = yearSeries(
    [doc({ tanggal_surat: "2026-02-10", added_at: "2026-11-20T00:00:00Z" })],
    2026,
  );
  expect(rows[1].masuk).toBe(1);
  expect(rows[10].masuk).toBe(0);
});
