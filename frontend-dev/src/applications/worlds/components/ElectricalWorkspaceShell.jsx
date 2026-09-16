import { useEffect, useRef, useState } from "react";

function ActionButton({ label, accessibleLabel, active, onClick, icon, emphasis = false }) {
  const tone = emphasis ? "bg-[#26384e] text-white shadow-[0_3px_10px_rgba(25,39,58,0.16)] hover:bg-[#314761]" : active ? "bg-[#e7edf2] text-[#20364e]" : "text-[#69788a] hover:bg-[#eef2f4] hover:text-[#2e4057]";
  const iconTone = emphasis ? "text-white" : active ? "text-[#405a75]" : "text-[#8a97a5] group-hover:text-[#5e7084]";
  return <button type="button" aria-label={accessibleLabel ?? label} aria-pressed={active} onClick={onClick} className={`group inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold transition ${tone}`}><span className={`flex h-4 w-4 items-center justify-center ${iconTone}`}>{icon}</span>{label}</button>;
}
function LayersIcon() { return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.35"><path d="m2.5 5 5.5-2.5L13.5 5 8 7.5 2.5 5Z"/><path d="m2.5 8 5.5 2.5L13.5 8M2.5 11l5.5 2.5 5.5-2.5"/></svg>; }
function InspectIcon() { return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.35"><circle cx="7" cy="7" r="3.8"/><path d="m10 10 3.2 3.2M5.7 7h2.6M7 5.7v2.6"/></svg>; }
function ChartIcon() { return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.35"><path d="M2.5 12.5h11M3 11V7.5l2.5-2 2.2 2.5L12.5 4v7"/></svg>; }
function FocusIcon() { return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.35"><path d="M5.5 2.5H2.5v3M10.5 2.5h3v3M5.5 13.5H2.5v-3M10.5 13.5h3v-3"/></svg>; }
function CrosshairIcon() { return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.35"><circle cx="8" cy="8" r="2.2"/><path d="M8 2.5v3M8 10.5v3M2.5 8h3M10.5 8h3"/></svg>; }

export default function ElectricalWorkspaceShell({ children, library, inspector, instrument, headerCenter, workspace }) {
  const [focusMode, setFocusMode] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [instrumentOpen, setInstrumentOpen] = useState(false);
  const [instrumentHeight, setInstrumentHeight] = useState(230);
  const resizingRef = useRef(false);
  const simulationWorkspace = workspace === "simulation";
  const showInstrument = instrumentOpen || simulationWorkspace;

  useEffect(() => {
    const onPointerMove = event => { if (!resizingRef.current) return; const shell = document.querySelector('[data-testid="electrical-workspace"]'); if (!shell) return; const rect = shell.getBoundingClientRect(); setInstrumentHeight(Math.min(460, Math.max(180, rect.bottom - event.clientY - 28))); };
    const onPointerUp = () => { resizingRef.current = false; document.body.style.removeProperty("cursor"); document.body.style.removeProperty("user-select"); };
    const onSelection = event => { const hasSelection = Boolean(event.detail?.selectedNode || event.detail?.selectedEdgeId || event.detail?.selectedTerminal || event.detail?.selectedResultEntity); setInspectorOpen(hasSelection); };
    const onComponentAdded = () => setLibraryOpen(false);
    const onExampleLoaded = () => { setLibraryOpen(false); setInspectorOpen(false); };
    const onProbeAdded = event => { if (event.detail?.__replayed) return; setInstrumentOpen(true); setInspectorOpen(true); requestAnimationFrame(() => window.dispatchEvent(new CustomEvent("worlds:add-probe", { detail: { ...event.detail, __replayed: true } }))); };
    const onLibraryClose = () => setLibraryOpen(false);
    window.addEventListener("pointermove", onPointerMove); window.addEventListener("pointerup", onPointerUp); window.addEventListener("worlds:selection-change", onSelection); window.addEventListener("worlds:add-component", onComponentAdded); window.addEventListener("worlds:load-example", onExampleLoaded); window.addEventListener("worlds:add-probe", onProbeAdded); window.addEventListener("worlds:close-library", onLibraryClose);
    return () => { window.removeEventListener("pointermove", onPointerMove); window.removeEventListener("pointerup", onPointerUp); window.removeEventListener("worlds:selection-change", onSelection); window.removeEventListener("worlds:add-component", onComponentAdded); window.removeEventListener("worlds:load-example", onExampleLoaded); window.removeEventListener("worlds:add-probe", onProbeAdded); window.removeEventListener("worlds:close-library", onLibraryClose); };
  }, []);

  const beginResize = event => { if (!showInstrument || focusMode) return; event.preventDefault(); resizingRef.current = true; document.body.style.cursor = "ns-resize"; document.body.style.userSelect = "none"; };
  const openLibrary = () => { setLibraryOpen(true); setInspectorOpen(false); };
  const openInspector = () => setInspectorOpen(value => !value);
  const openInstrument = () => setInstrumentOpen(value => !value);

  return <div data-testid="electrical-workspace" data-focus-mode={focusMode ? "true" : "false"} className="flex h-full min-h-0 flex-col overflow-hidden bg-[#e7ebee] text-[#17253a]">
    <header className="relative z-50 flex h-12 shrink-0 items-center border-b border-[#cfd7df] bg-[#f6f8f9] px-3 shadow-[0_1px_0_rgba(255,255,255,0.8)]">
      <div className="flex w-[210px] shrink-0 items-center gap-2.5"><div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#26384e] text-[7px] font-bold tracking-[0.08em] text-white shadow-[0_2px_5px_rgba(25,39,58,0.18)]">LO</div><div><div className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#718093]">Lab OS</div><div className="mt-0.5 text-[11px] font-semibold tracking-[-0.01em] text-[#26374d]">Electrical Workbench</div></div></div>
      <div data-testid="workspace-header-context" className="min-w-0 flex-1 px-4">{headerCenter}</div>
      <div className="flex shrink-0 items-center gap-1.5"><button type="button" aria-label={focusMode ? "Exit focus mode" : "Focus mode"} aria-pressed={focusMode} onClick={() => setFocusMode(value => !value)} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold transition ${focusMode ? "bg-[#e2e8ed] text-[#22374f]" : "text-[#68788a] hover:bg-[#eef2f4] hover:text-[#2e4057]"}`}><FocusIcon />{focusMode ? "Exit" : "Focus"}</button></div>
    </header>
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <main data-testid="workspace-canvas-surface" className="absolute inset-0 overflow-hidden bg-[#f8faf9]">{children}</main>
      {!focusMode && <div className="absolute left-4 top-4 z-20 flex items-center gap-1 rounded-xl border border-[#d2dae1] bg-white/94 p-1 shadow-[0_8px_22px_rgba(24,37,58,0.10)] backdrop-blur">
        <ActionButton label="Add" accessibleLabel="Library" onClick={openLibrary} icon={<LayersIcon />} emphasis />
        <div className="mx-0.5 h-5 w-px bg-[#e0e5e9]" />
        <ActionButton label="Inspect" accessibleLabel="Inspector" active={inspectorOpen} onClick={openInspector} icon={<InspectIcon />} />
        <ActionButton label="Measure" accessibleLabel="Instruments" active={showInstrument} onClick={openInstrument} icon={<ChartIcon />} />
        <div className="mx-0.5 h-5 w-px bg-[#e0e5e9]" />
        <button type="button" aria-label="Center schematic" onClick={() => window.dispatchEvent(new CustomEvent("worlds:fit-view"))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8996a4] transition hover:bg-[#eef2f4] hover:text-[#52677d]"><CrosshairIcon /></button>
      </div>}
      {!focusMode && <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-md border border-[#d8dfe5] bg-white/88 px-2.5 py-1.5 shadow-[0_2px_8px_rgba(24,37,58,0.04)] backdrop-blur"><span className="text-[8px] font-medium uppercase tracking-[0.1em] text-[#98a2ad]">Scroll zoom</span><span className="h-1 w-1 rounded-full bg-[#c0c7ce]"/><span className="text-[8px] font-medium uppercase tracking-[0.1em] text-[#98a2ad]">Drag pan</span></div>}
      {!focusMode && libraryOpen && <aside data-testid="workspace-library-surface" className="absolute bottom-4 left-4 top-4 z-30 flex w-[min(300px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-[#cbd4dc] bg-[#fbfcfd]/98 shadow-[0_20px_50px_rgba(24,37,58,0.18)] backdrop-blur">{library}</aside>}
      {!focusMode && inspectorOpen && <aside data-testid="workspace-inspector-surface" className="absolute right-4 top-4 z-30 flex max-h-[calc(100%-32px)] w-[min(330px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-[#cbd4dc] bg-[#fbfcfd]/98 shadow-[0_20px_50px_rgba(24,37,58,0.18)] backdrop-blur">{inspector}</aside>}
      {!focusMode && showInstrument && <section data-testid="workspace-instrument-surface" style={{ height: instrumentHeight }} className="absolute bottom-4 left-4 right-4 z-40 overflow-hidden rounded-2xl border border-[#cbd4dc] bg-[#fbfcfd]/99 shadow-[0_20px_50px_rgba(24,37,58,0.2)] backdrop-blur">{instrument}</section>}
      {!focusMode && showInstrument && <div data-testid="instrument-resize-handle" role="separator" aria-label="Resize instrument panel" aria-orientation="horizontal" onPointerDown={beginResize} style={{ bottom: instrumentHeight + 8 }} className="absolute left-1/2 z-50 flex h-4 w-16 -translate-x-1/2 cursor-ns-resize items-center justify-center rounded-full border border-[#cbd3dc] bg-white/96 shadow-sm"><span className="h-1 w-7 rounded-full bg-[#9eabb8]" /></div>}
    </div>
  </div>;
}
