import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { confirm, open, save } from "@tauri-apps/plugin-dialog";
import ImportDialog from "./components/ImportDialog";
import BackupViewer from "./components/BackupViewer";
import PdfViewer from "./components/PdfViewer";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import { insertDocument, listDocuments, type Doc, type LetterKind } from "./lib/db";
import { removeDocument, readBackupArchive, revealDocumentFile, saveDocumentCopy } from "./lib/documents";
import { formatDate } from "./lib/format";
import type { DocActions, Page } from "./lib/types";
import Dashboard from "./pages/Dashboard";
import Letters from "./pages/Letters";
import Report from "./pages/Report";

const pageTitles: Record<Page, string> = {
  dashboard: "dashboard",
  masuk: "surat masuk",
  keluar: "surat keluar",
  laporan: "laporan",
};

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [importKind, setImportKind] = useState<LetterKind | null>(null);
  const [unitFilter, setUnitFilter] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Doc | null>(null);
  const [busy, setBusy] = useState(false);
  const [backupPreview, setBackupPreview] = useState<{ name: string; rows: Doc[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setDocs(await listDocuments());
  }, []);

  useEffect(() => {
    refresh().catch((error) => setToast(`Gagal memuat data: ${String(error)}`));
  }, [refresh]);

  const actions: DocActions = useMemo(
    () => ({
      onOpen: (doc) => {
        if (!doc.rel_path) {
          setToast("Dokumen ini belum punya file PDF");
          return;
        }
        setViewingDoc(doc);
      },
      onSave: (doc) => {
        if (!doc.rel_path) {
          setToast("Dokumen ini belum punya file PDF");
          return;
        }
        saveDocumentCopy(doc)
          .then((saved) => {
            if (saved) setToast("Salinan dokumen disimpan");
          })
          .catch((error) => setToast(`Gagal menyimpan: ${String(error)}`));
      },
      onEdit: (doc) => {
        setEditingDoc(doc);
      },
      onRevealFile: (doc) => {
        if (!doc.rel_path) {
          setToast("Dokumen ini belum punya file PDF");
          return;
        }
        revealDocumentFile(doc).catch((error) =>
          setToast(`Gagal membuka folder: ${String(error)}`),
        );
      },
      onCopy: (doc, no) => {
        void (async () => {
          const lines = [
            `No: ${no}`,
            `Tanggal: ${formatDate(doc.added_at)}`,
            `Nomor Surat: ${doc.nomor_surat ?? "-"}`,
            `Perihal: ${doc.title}`,
            `${doc.kind === "keluar" ? "Kepada" : "Asal Surat"}: ${doc.asal_surat ?? "-"}`,
          ];
          if (doc.unit) lines.push(`Bidang: ${doc.unit}`);
          lines.push(`${doc.kind === "keluar" ? "Pengolah" : "Disposisi"}: ${doc.disposisi ?? "-"}`);
          try {
            await navigator.clipboard.writeText(lines.join("\n"));
            setToast("Metadata disalin ke clipboard");
          } catch (error) {
            setToast(`Gagal menyalin: ${String(error)}`);
          }
        })();
      },
      onDelete: (doc) => {
        void (async () => {
          try {
            const approved = await confirm(
              `Hapus "${doc.title}" dari arsip? File PDF ikut terhapus dan tidak bisa dikembalikan.`,
              {
                title: "Hapus dokumen",
                kind: "warning",
                okLabel: "Hapus",
                cancelLabel: "Batal",
              },
            );
            if (!approved) return;
            await removeDocument(doc);
            await refresh();
            setToast("Dokumen dihapus");
          } catch (error) {
            setToast(`Gagal menghapus: ${String(error)}`);
          }
        })();
      },
    }),
    [refresh],
  );

  const handleBackup = useCallback(async () => {
    let rows: Doc[];
    try {
      rows = await listDocuments();
    } catch (error) {
      setToast(`Gagal memuat data: ${String(error)}`);
      return;
    }
    const dates = rows.map((row) => row.added_at.slice(0, 10)).sort();
    const today = new Date().toISOString().slice(0, 10);
    const first = dates[0] ?? today;
    const last = dates[dates.length - 1] ?? today;
    const suffix = first === last ? first : `${first}_sd_${last}`;
    const destination = await save({
      defaultPath: `kelola-arsip-${suffix}.zip`,
      filters: [{ name: "Arsip ZIP", extensions: ["zip"] }],
    });
    if (!destination) return;
    setBusy(true);
    try {
      const packed = await invoke<number>("backup_archive", {
        destPath: destination,
        rows,
      });
      setToast(`Backup selesai: ${packed} file PDF`);
    } catch (error) {
      setToast(`Gagal backup: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  }, []);

  const handlePurge = useCallback(async () => {
    const warned = await confirm(
      "Hapus seluruh data surat? Semua metadata dan file PDF akan dihapus permanen dan tidak bisa dikembalikan. Buat backup terlebih dahulu lewat tombol Backup.",
      {
        title: "Hapus semua data",
        kind: "warning",
        okLabel: "Saya sudah backup",
        cancelLabel: "Batal",
      },
    );
    if (!warned) return;

    const approved = await confirm(
      "Konfirmasi terakhir: seluruh surat masuk dan surat keluar akan dihapus sekarang. Lanjutkan?",
      {
        title: "Konfirmasi hapus semua data",
        kind: "warning",
        okLabel: "Hapus semua",
        cancelLabel: "Batal",
      },
    );
    if (!approved) return;

    setBusy(true);
    try {
      const rows = await listDocuments();
      for (const row of rows) {
        await removeDocument(row);
      }
      await refresh();
      setToast(`${rows.length} dokumen dihapus. Arsip siap dipakai dari awal.`);
    } catch (error) {
      setToast(`Gagal menghapus data: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const handleOpenBackup = useCallback(async () => {
    const source = await open({
      multiple: false,
      filters: [{ name: "Arsip ZIP", extensions: ["zip"] }],
    });
    if (typeof source !== "string") return;

    setBusy(true);
    try {
      const rows = await readBackupArchive(source);
      setBackupPreview({ name: source.split(/[\\/]/).pop() ?? source, rows });
    } catch (error) {
      setToast(`Gagal membuka backup: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  }, []);

  const handleRestore = useCallback(async () => {
    const source = await open({
      multiple: false,
      filters: [{ name: "Arsip ZIP", extensions: ["zip"] }],
    });
    if (typeof source !== "string") return;

    const approved = await confirm(
      "Pulihkan backup ini? Dokumen yang sudah ada tidak akan ditimpa atau dihapus.",
      { title: "Pulihkan backup", kind: "warning", okLabel: "Pulihkan", cancelLabel: "Batal" },
    );
    if (!approved) return;

    setBusy(true);
    try {
      const rows = await invoke<Doc[]>("restore_archive", { sourcePath: source });
      for (const row of rows) {
        await insertDocument(row, true);
      }
      await refresh();
      setToast(`${rows.length} dokumen dipulihkan`);
    } catch (error) {
      setToast(`Gagal memulihkan: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return (
    <div className="flex h-full flex-col bg-slate-100 text-slate-900">
      <header className="flex h-14 shrink-0 items-center bg-[#0d1b2e] px-6">
        <h1 className="text-sm font-medium text-slate-300">{pageTitles[page]}</h1>
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar
          active={page}
          activeUnit={unitFilter}
          onNavigate={setPage}
          onSelectUnit={setUnitFilter}
          onImport={() => setImportKind(page === "keluar" ? "keluar" : "masuk")}
        />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div key={page} className="animate-page space-y-4 p-6">
            {page === "dashboard" && (
              <Dashboard
                docs={docs}
                onSeeAll={() => setPage("masuk")}
                {...actions}
              />
            )}
            {page === "masuk" && (
              <Letters
                kind="masuk"
                docs={docs}
                onImport={() => setImportKind("masuk")}
                {...actions}
              />
            )}
            {page === "keluar" && (
              <Letters
                kind="keluar"
                docs={docs}
                unit={unitFilter}
                onImport={() => setImportKind("keluar")}
                {...actions}
              />
            )}
            {page === "laporan" && (
              <Report
                docs={docs}
                busy={busy}
                onBackup={handleBackup}
                onRestore={handleRestore}
                onPurge={handlePurge}
                onOpenBackup={handleOpenBackup}
              />
            )}
          </div>
        </main>
      </div>

      {importKind && (
        <ImportDialog
          defaultKind={importKind}
          defaultUnit={unitFilter ?? undefined}
          onClose={() => setImportKind(null)}
          onImported={(message) => {
            setToast(message);
            refresh().catch((error) => setToast(`Gagal memuat data: ${String(error)}`));
          }}
        />
      )}

      {editingDoc && (
        <ImportDialog
          defaultKind={editingDoc.kind}
          doc={editingDoc}
          onClose={() => setEditingDoc(null)}
          onImported={(message) => {
            setToast(message);
            refresh().catch((error) => setToast(`Gagal memuat data: ${String(error)}`));
          }}
        />
      )}

      {viewingDoc && <PdfViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />}

      {backupPreview && (
        <BackupViewer
          name={backupPreview.name}
          rows={backupPreview.rows}
          onClose={() => setBackupPreview(null)}
        />
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
