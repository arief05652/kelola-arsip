import type { Doc } from "./db";

export type Page = "dashboard" | "masuk" | "keluar" | "laporan";

export type DocActions = {
  onOpen: (doc: Doc) => void;
  onRevealFile: (doc: Doc) => void;
  onSave: (doc: Doc) => void;
  onEdit: (doc: Doc) => void;
  onDelete: (doc: Doc) => void;
  onCopy: (doc: Doc, no: number) => void;
};
