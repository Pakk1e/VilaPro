import { useState } from "react";

function SurfaceToggle({ label, active, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="inline-flex h-7 items-center rounded border border-[#d7dce2] bg-white px-2.5 text-[10px] font-medium text-[#4e5b6b] transition hover:border-[#aeb8c4] hover:bg-[#f8fafc]"
    >
      {label}
    </button>
  );
}

export default function ElectricalWorkspaceShell({ children }) {
  const [focusMode, setFocusMode] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [instrumentOpen, setInstrumentOpen] = useState(true);

  return (
    <div
      data-testid="electrical-workspace"
      data-focus-mode={focusMode ? "true" : "false"}
      className="flex h-full min-h-0 flex-col bg-[#f3f5f7] text-[#17253a]"
    >
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#d9dde2] bg-white px-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#667382]">
            Lab OS
          </div>
          <div className="h-4 w-px bg-[#d9dde2]" />
          <div className="min-w-0 truncate text-xs font-semibold text-[#26364d]">
            Electrical Workspace
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!focusMode && (
            <>
              <SurfaceToggle label="Library" active={libraryOpen} onClick={() => setLibraryOpen((value) => !value)} />
              <SurfaceToggle label="Inspector" active={inspectorOpen} onClick={() => setInspectorOpen((value) => !value)} />
              <SurfaceToggle label="Instruments" active={instrumentOpen} onClick={() => setInstrumentOpen((value) => !value)} />
            </>
          )}
          <button
            type="button"
            onClick={() => setFocusMode((value) => !value)}
            className="ml-1 inline-flex h-7 items-center rounded border border-[#c9d0d8] bg-[#f8fafc] px-2.5 text-[10px] font-semibold text-[#33445a] transition hover:bg-white"
          >
            {focusMode ? "Exit focus" : "Focus"}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden p-2">
        <div className="flex h-full min-h-0 overflow-hidden border border-[#d7dce2] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {!focusMode && libraryOpen && (
            <aside
              data-testid="workspace-library-surface"
              className="flex w-[250px] shrink-0 flex-col border-r border-[#d9dde2] bg-[#fafbfc]"
            >
              <div className="border-b border-[#e3e6ea] px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#667382]">
                  Component Library
                </div>
                <input
                  aria-label="Search components"
                  placeholder="Search components..."
                  className="mt-2 h-8 w-full rounded border border-[#d4dae1] bg-white px-2.5 text-xs text-[#26364d] outline-none focus:border-[#8797aa]"
                />
              </div>
              <div className="flex-1 px-3 py-3 text-[10px] text-[#7b8795]">
                <div className="font-semibold uppercase tracking-[0.12em] text-[#596777]">Basic</div>
                <div className="mt-2">Sources</div>
                <div className="mt-2">Diodes</div>
                <div className="mt-2">Transistors</div>
                <div className="mt-2">MOSFETs</div>
                <div className="mt-2">Ground / references</div>
              </div>
            </aside>
          )}

          <main data-testid="workspace-canvas-surface" className="relative min-w-0 flex-1 overflow-hidden">
            {children}
          </main>

          {!focusMode && inspectorOpen && (
            <aside
              data-testid="workspace-inspector-surface"
              className="flex w-[250px] shrink-0 flex-col border-l border-[#d9dde2] bg-[#fafbfc]"
            >
              <div className="border-b border-[#e3e6ea] px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#667382]">Inspector</div>
              </div>
              <div className="flex flex-1 items-center justify-center px-5 text-center text-xs leading-5 text-[#8a929c]">
                Select a component, terminal, wire, or result to inspect it.
              </div>
            </aside>
          )}
        </div>

        {!focusMode && instrumentOpen && (
          <section
            data-testid="workspace-instrument-surface"
            className="mt-2 h-[150px] shrink-0 overflow-hidden border border-[#d7dce2] bg-white"
          >
            <div className="flex h-9 items-center gap-4 border-b border-[#e3e6ea] px-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#667382]">Instruments</div>
              <button type="button" className="text-[10px] font-medium text-[#43556c]">Waveform</button>
              <button type="button" className="text-[10px] font-medium text-[#7b8795]">Table</button>
              <button type="button" className="text-[10px] font-medium text-[#7b8795]">Measurements</button>
            </div>
            <div className="flex h-[calc(100%-36px)] items-center justify-center text-xs text-[#8a929c]">
              Run an analysis or probe a circuit quantity to open an instrument.
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
