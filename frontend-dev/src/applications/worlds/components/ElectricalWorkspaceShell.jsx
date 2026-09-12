import { useState } from "react";

function SurfaceToggle({ label, active, onClick }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className="inline-flex h-7 items-center border border-[#cfd5dc] bg-white px-2.5 text-[10px] font-medium text-[#4e5b6b] transition hover:border-[#9da8b5] hover:bg-[#f8fafc]">
      {label}
    </button>
  );
}

export default function ElectricalWorkspaceShell({ children, library, inspector, instrument }) {
  const [focusMode, setFocusMode] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [instrumentOpen, setInstrumentOpen] = useState(true);

  return (
    <div data-testid="electrical-workspace" data-focus-mode={focusMode ? "true" : "false"} className="flex h-full min-h-0 flex-col bg-[#f3f5f7] text-[#17253a]">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#d9dde2] bg-white px-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#667382]">Lab OS</div>
          <div className="h-4 w-px bg-[#d9dde2]" />
          <div className="min-w-0 truncate text-xs font-semibold text-[#26364d]">Electrical Workspace</div>
        </div>
        <div className="flex items-center gap-1.5">
          {!focusMode && <>
            <SurfaceToggle label="Library" active={libraryOpen} onClick={() => setLibraryOpen((value) => !value)} />
            <SurfaceToggle label="Inspector" active={inspectorOpen} onClick={() => setInspectorOpen((value) => !value)} />
            <SurfaceToggle label="Instruments" active={instrumentOpen} onClick={() => setInstrumentOpen((value) => !value)} />
          </>}
          <button type="button" onClick={() => setFocusMode((value) => !value)} className="ml-1 inline-flex h-7 items-center border border-[#c9d0d8] bg-[#f8fafc] px-2.5 text-[10px] font-semibold text-[#33445a] transition hover:bg-white">
            {focusMode ? "Exit focus" : "Focus"}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden p-2">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border border-[#d7dce2] bg-white">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {!focusMode && libraryOpen && <aside data-testid="workspace-library-surface" className="flex w-[260px] shrink-0 flex-col overflow-hidden border-r border-[#d9dde2] bg-[#fafbfc]">{library}</aside>}
            <main data-testid="workspace-canvas-surface" className="relative min-w-0 flex-1 overflow-hidden">{children}</main>
            {!focusMode && inspectorOpen && <aside data-testid="workspace-inspector-surface" className="flex w-[280px] shrink-0 flex-col overflow-hidden border-l border-[#d9dde2] bg-[#fafbfc]">{inspector}</aside>}
          </div>
          {!focusMode && instrumentOpen && <section data-testid="workspace-instrument-surface" className="h-[180px] shrink-0 overflow-hidden border-t border-[#d9dde2] bg-white">{instrument}</section>}
        </div>
      </div>
    </div>
  );
}
