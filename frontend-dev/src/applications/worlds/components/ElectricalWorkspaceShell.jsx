import { useEffect, useRef, useState } from "react";

function ToolButton({ label, active, onClick, icon }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`group inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[10px] font-medium transition ${active ? "bg-[#e8edf2] text-[#20334a]" : "text-[#6d7b8c] hover:bg-[#f0f3f5] hover:text-[#2e4057]"}`}><span className={`flex h-4 w-4 items-center justify-center ${active ? "text-[#405a75]" : "text-[#8996a5] group-hover:text-[#5e7084]"}`}>{icon}</span>{label}</button>;
}
function LayersIcon() { return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m2.5 5 5.5-2.5L13.5 5 8 7.5 2.5 5Z"/><path d="m2.5 8 5.5 2.5L13.5 8M2.5 11l5.5 2.5 5.5-2.5"/></svg>; }
function SlidersIcon() { return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 4h10M3 8h10M3 12h10"/><circle cx="6" cy="4" r="1.2" fill="currentColor" stroke="none"/><circle cx="10" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="7" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>; }
function ChartIcon() { return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2.5 12.5h11M3 11V7.5l2.5-2 2.2 2.5L12.5 4v7"/></svg>; }
function FocusIcon() { return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M5.5 2.5H2.5v3M10.5 2.5h3v3M5.5 13.5H2.5v-3M10.5 13.5h3v-3"/></svg>; }

export default function ElectricalWorkspaceShell({ children, library, inspector, instrument, headerCenter }) {
  const [focusMode, setFocusMode] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [instrumentOpen, setInstrumentOpen] = useState(false);
  const [instrumentHeight, setInstrumentHeight] = useState(280);
  const resizingRef = useRef(false);

  useEffect(() => {
    const onPointerMove = event => {
      if (!resizingRef.current) return;
      const shell = document.querySelector('[data-testid="electrical-workspace"]');
      if (!shell) return;
      const rect = shell.getBoundingClientRect();
      setInstrumentHeight(Math.min(460, Math.max(180, rect.bottom - event.clientY - 28)));
    };
    const onPointerUp = () => { resizingRef.current = false; document.body.style.removeProperty("cursor"); document.body.style.removeProperty("user-select"); };
    const onSelection = event => { if (event.detail?.selectedNode || event.detail?.selectedEdgeId || event.detail?.selectedTerminal || event.detail?.selectedResultEntity) setInspectorOpen(true); };
    const onComponentAdded = () => setLibraryOpen(false);
    const onExampleLoaded = () => setLibraryOpen(false);
    const onProbeAdded = event => {
      if (event.detail?.__replayed) return;
      setInstrumentOpen(true);
      setInspectorOpen(true);
      requestAnimationFrame(() => window.dispatchEvent(new CustomEvent("worlds:add-probe", { detail: { ...event.detail, __replayed: true } })));
    };
    const onLibraryClose = () => setLibraryOpen(false);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("worlds:selection-change", onSelection);
    window.addEventListener("worlds:add-component", onComponentAdded);
    window.addEventListener("worlds:load-example", onExampleLoaded);
    window.addEventListener("worlds:add-probe", onProbeAdded);
    window.addEventListener("worlds:close-library", onLibraryClose);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("worlds:selection-change", onSelection);
      window.removeEventListener("worlds:add-component", onComponentAdded);
      window.removeEventListener("worlds:load-example", onExampleLoaded);
      window.removeEventListener("worlds:add-probe", onProbeAdded);
      window.removeEventListener("worlds:close-library", onLibraryClose);
    };
  }, []);

  const beginResize = event => {
    if (!instrumentOpen || focusMode) return;
    event.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  };

  return <div data-testid="electrical-workspace" data-focus-mode={focusMode ? "true" : "false"} className="flex h-full min-h-0 flex-col overflow-hidden bg-[#eef1f3] text-[#17253a]">
    <header className="relative z-50 flex h-11 shrink-0 items-center border-b border-[#d9dfe4] bg-[#f7f8f9] px-3">
      <div className="flex w-[220px] shrink-0 items-center gap-2"><div className="flex h-6 w-6 items-center justify-center rounded bg-[#26384e] text-[7px] font-bold tracking-[0.08em] text-white">LO</div><div className="flex items-baseline gap-2"><div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#617083]">Lab OS</div><div className="text-[11px] font-semibold text-[#26374d]">Electrical</div></div></div>
      <div data-testid="workspace-header-context" className="min-w-0 flex-1 px-4">{headerCenter}</div>
      <div className="flex shrink-0 items-center gap-1">
        {!focusMode && <div className="flex items-center rounded-md border border-[#d8dee4] bg-white p-0.5"><ToolButton label="Library" active={libraryOpen} onClick={() => setLibraryOpen(value => !value)} icon={<LayersIcon />} /><ToolButton label="Inspector" active={inspectorOpen} onClick={() => setInspectorOpen(value => !value)} icon={<SlidersIcon />} /><ToolButton label="Instruments" active={instrumentOpen} onClick={() => setInstrumentOpen(value => !value)} icon={<ChartIcon />} /></div>}
        <button type="button" aria-pressed={focusMode} onClick={() => setFocusMode(value => !value)} className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[10px] font-medium transition ${focusMode ? "bg-[#e4e9ee] text-[#22374f]" : "text-[#68788a] hover:bg-[#eef2f4] hover:text-[#2e4057]"}`}><FocusIcon />{focusMode ? "Exit" : "Focus"}</button>
      </div>
    </header>
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <main data-testid="workspace-canvas-surface" className="absolute inset-0 overflow-hidden bg-[#fafbf9]">{children}</main>
      {!focusMode && <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-[#d9dfe4] bg-white/88 px-2.5 py-1.5 shadow-[0_4px_14px_rgba(24,37,58,0.06)] backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-[#7289a1]"/><span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#657487]">Schematic</span></div>}
      {!focusMode && <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-lg border border-[#d9dfe4] bg-white/88 px-2.5 py-1.5 shadow-[0_4px_14px_rgba(24,37,58,0.05)] backdrop-blur"><span className="text-[8px] font-medium uppercase tracking-[0.1em] text-[#98a2ad]">Scroll to zoom · drag to pan</span></div>}
      {!focusMode && libraryOpen && <aside data-testid="workspace-library-surface" className="absolute bottom-4 left-4 top-4 z-30 flex w-[276px] flex-col overflow-hidden rounded-xl border border-[#d0d8df] bg-[#fbfcfd]/98 shadow-[0_18px_42px_rgba(24,37,58,0.16)] backdrop-blur">{library}</aside>}
      {!focusMode && inspectorOpen && <aside data-testid="workspace-inspector-surface" className="absolute bottom-4 right-4 top-4 z-30 flex w-[304px] flex-col overflow-hidden rounded-xl border border-[#d0d8df] bg-[#fbfcfd]/98 shadow-[0_18px_42px_rgba(24,37,58,0.16)] backdrop-blur">{inspector}</aside>}
      {!focusMode && instrumentOpen && <section data-testid="workspace-instrument-surface" style={{ height: instrumentHeight }} className="absolute bottom-4 left-4 right-4 z-40 overflow-hidden rounded-xl border border-[#d0d8df] bg-[#fbfcfd]/99 shadow-[0_18px_42px_rgba(24,37,58,0.18)] backdrop-blur">{instrument}</section>}
      {!focusMode && instrumentOpen && <div data-testid="instrument-resize-handle" role="separator" aria-label="Resize instrument panel" aria-orientation="horizontal" onPointerDown={beginResize} style={{ bottom: instrumentHeight + 8 }} className="absolute left-1/2 z-50 flex h-4 w-14 -translate-x-1/2 cursor-ns-resize items-center justify-center rounded-full border border-[#cbd3dc] bg-white/95 shadow-sm"><span className="h-1 w-6 rounded-full bg-[#9eabb8]" /></div>}
    </div>
  </div>;
}
