import { useEffect, useState } from "react";
import {
  Archive,
  ChevronDown,
  FileBarChart,
  Inbox,
  LayoutDashboard,
  Plus,
  Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Page } from "../lib/types";
import { UNITS } from "../lib/units";

type Props = {
  active: Page;
  activeUnit: string | null;
  onNavigate: (page: Page) => void;
  onSelectUnit: (unit: string | null) => void;
  onImport: () => void;
};

type NavItem = {
  page: Page;
  label: string;
  icon: LucideIcon;
};

const activeClass = "bg-blue-600 text-white shadow-sm";
const idleClass = "text-slate-400 hover:bg-white/5 hover:text-slate-200";

export default function Sidebar({
  active,
  activeUnit,
  onNavigate,
  onSelectUnit,
  onImport,
}: Props) {
  const [treeOpen, setTreeOpen] = useState(active === "keluar");

  useEffect(() => {
    if (active === "keluar") setTreeOpen(true);
  }, [active]);

  const nav: NavItem[] = [
    { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { page: "masuk", label: "Surat Masuk", icon: Inbox },
    { page: "keluar", label: "Surat Keluar", icon: Send },
    { page: "laporan", label: "Laporan", icon: FileBarChart },
  ];

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-[#0d1b2e] px-3 py-4">
      <div className="flex items-center gap-2 px-2 pb-6">
        <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-white">
          <Archive className="size-4" />
        </span>
        <span className="text-sm font-semibold text-white">KelolaArsip</span>
      </div>

      <nav className="space-y-1">
        {nav.map(({ page, label, icon: Icon }) => {
          const isActive = page === active && (page !== "keluar" || activeUnit === null);

          if (page !== "keluar") {
            return (
              <button
                key={page}
                type="button"
                onClick={() => onNavigate(page)}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isActive ? activeClass : idleClass
                }`}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </button>
            );
          }

          return (
            <div key={page}>
              <div
                className={`flex items-center rounded-lg text-xs font-medium transition-colors ${
                  isActive ? activeClass : idleClass
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectUnit(null);
                    onNavigate("keluar");
                    setTreeOpen(true);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2"
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{label}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTreeOpen((open) => !open)}
                  aria-label={treeOpen ? "Tutup daftar bidang" : "Buka daftar bidang"}
                  aria-expanded={treeOpen}
                  className="grid size-6 shrink-0 place-items-center rounded-md text-current opacity-70 hover:opacity-100"
                >
                  <ChevronDown
                    className={`size-3.5 transition-transform ${treeOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </div>

              {treeOpen && (
                <div className="animate-tree mt-1 space-y-0.5 border-l border-white/10 pl-3">
                  {UNITS.map((unit) => {
                    const unitActive = active === "keluar" && activeUnit === unit;
                    return (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => {
                          onSelectUnit(unit);
                          onNavigate("keluar");
                        }}
                        aria-current={unitActive ? "page" : undefined}
                        className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] transition-colors ${
                          unitActive
                            ? "bg-blue-600/90 text-white"
                            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        }`}
                      >
                        <span className="size-1 shrink-0 rounded-full bg-current opacity-60" />
                        <span className="truncate">{unit}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={onImport}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <Plus className="size-4" />
          Tambah Dokumen
        </button>
      </div>
    </aside>
  );
}
