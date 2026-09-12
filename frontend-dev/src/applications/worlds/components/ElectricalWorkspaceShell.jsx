import { useEffect, useRef, useState } from "react";

function ToolButton({ label, active, onClick, icon }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`group inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-[10px] font-medium transition ${active ? "bg-[#eef2f5] text-[#22344b] shadow-[inset_0_0_0_1px_rgba(126,143,160,0.28)]" : "text-[#68788b] hover:bg-[#f1f4f6] hover:text-[#2e4058]"}`}><span className={`flex h-4 w-4 items-center justify-center rounded ${active ? "text-[#40566f]" : "text-[#8b98a6] group-hover:text-[#56697e]"}`}>{icon}</span>{label}</button>;
}

function LayersIcon() { return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m2.5 5 5.5-2.5L13.5 5 8 7.5 2.5 5Z"/><path d="m2.5 8 5.5 2.5L13.5 8M2.5 11l5.5 2.5 5.5-2.5"/></svg>; }
function SlidersIcon() { return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 4h10M3 8h10M3 12h10"/><circle cx="6" cy="4" r="1.2" fill="currentColor" stroke="none"/><circle cx="10" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="7" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>; }
function ChartIcon() { return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2.5 12.5h11M3 11V7.5l2.5-2 2.2 2.5L12.5 4v7"/></svg>; }

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
    const onProbeAdded = () => { setInstrumentOpen(true); setInspectorOpen(true); };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("worlds:selection-change", onSelection);
    window.addEventListener("worlds:add-component", onComponentAdded);
    window.addEventListener("worlds:add-probe", onProbeAdded);
    return () => { window.removeEventListener("pointermove", onPointerMove); window.removeEventListener("pointerup", onPointerUp); window.removeEventListener("worlds:selection-change", onSelection); window.removeEventListener("worlds:add-component", onComponentAdded); window.removeEventListener("worlds:add-probe", onProbeAdded); };
  }, []);

  const beginResize = event => {
    if (!instrumentOpen || focusMode) return;
    event.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  };

  return <div data-testid="electrical-workspace" data-focus-mode={focusMode ? "true" : "false"} className="flex h-full min-h-0 flex-col overflow-hidden bg-[#edf0f2] text-[#17253a]">
    <header className="relative z-50 flex h-12 shrink-0 items-center border-b border-[#d7dde3] bg-[#f8f9fa] px-3">
      <div className="flex min-w-[230px] shrink-0 items-center gap-2.5"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#26384e] text-[8px] font-bold tracking-[0.08em] text-white shadow-sm">LO</div><div><div className="text-[9px] font-bold uppercase tracking-[0.19em] text-[#536275]">Lab OS</div><div className="text-[10px] font-semibold text-[#25364c]">Electrical Workspace</div></div></div>
      <div data-testid="workspace-header-context" className="min-w-0 flex-1 px-5">{headerCenter}</div>
      <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-[#d8dee4] bg-white/80 p-0.5 shadow-[0_1px_2px_rgba(24,37,58,0.03)]">
        {!focusMode && <><ToolButton label="Library" active={libraryOpen} onClick={() => setLibraryOpen(value => !value)} icon={<LayersIcon />} /><ToolButton label="Inspector" active={inspectorOpen} onClick={() => setInspectorOpen(value => !value)} icon={<SlidersIcon />} /><ToolButton label="Instruments" active={instrumentOpen} onClick={() => setInstrumentOpen(value => !value)} icon={<ChartIcon />} /></>}
        <button type="button" onClick={() => setFocusMode(value => !value)} className="ml-0.5 h-7 rounded-md px-2.5 text-[10px] font-medium text-[#52647a] transition hover:bg-[#eef2f5]">{focusMode ? "Exit focus" : "Focus"}</button>
      </div>
    </header>

    <div className="relative min-h-0 flex-1 overflow-hidden p-2">
      <main data-testid="workspace-canvas-surface" className="absolute inset-2 overflow-hidden rounded-md border border-[#d5dbe1] bg-[#fafbf9] shadow-[0_1px_4px_rgba(24,37,58,0.035)]">{children}</main>
      {!focusMode && libraryOpen && <aside data-testid="workspace-library-surface" className="absolute bottom-5 left-5 top-5 z-30 flex w-[300px] flex-col overflow-hidden rounded-xl border border-[#cfd7df] bg-[#fbfcfd]/98 shadow-[0_14px_36px_rgba(24,37,58,0.18)] backdrop-blur">{library}</aside>}
      {!focusMode && inspectorOpen && <aside data-testid="workspace-inspector-surface" className="absolute bottom-5 right-5 top-5 z-30 flex w-[310px] flex-col overflow-hidden rounded-xl border border-[#cfd7df] bg-[#fbfcfd]/98 shadow-[0_14px_36px_rgba(24,37,58,0.18)] backdrop-blur">{inspector}</aside>}
      {!focusMode && instrumentOpen && <section data-testid="workspace-instrument-surface" style={{ height: instrumentHeight }} className="absolute bottom-5 left-5 right-5 z-40 overflow-hidden rounded-xl border border-[#cfd7df] bg-[#fbfcfd]/99 shadow-[0_16px_40px_rgba(24,37,58,0.2)] backdrop-blur">{instrument}</section>}
      {!focusMode && instrumentOpen && <div data-testid="instrument-resize-handle" role="separator" aria-label="Resize instrument panel" aria-orientation="horizontal" onPointerDown={beginResize} style={{ bottom: instrumentHeight + 12 }} className="absolute left-1/2 z-50 flex h-4 w-16 -translate-x-1/2 cursor-ns-resize items-center justify-center rounded-full border border-[#cbd3dc] bg-white/95 shadow-sm"><span className="h-1 w-7 rounded-full bg-[#9eabb8]" /></div>}
    </div>
  </div>;
}
