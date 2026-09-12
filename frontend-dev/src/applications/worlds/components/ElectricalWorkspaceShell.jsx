import { useEffect, useRef, useState } from "react";

function SurfaceToggle({ label, active, onClick }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[10px] font-semibold transition ${active ? "border-[#cbd4df] bg-white text-[#243247] shadow-sm" : "border-transparent bg-transparent text-[#7b8796] hover:bg-white/70 hover:text-[#33445a]"}`}><span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#5c7898]" : "bg-[#cbd2da]"}`} />{label}</button>;
}

export default function ElectricalWorkspaceShell({ children, library, inspector, instrument, headerCenter }) {
  const [focusMode, setFocusMode] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [instrumentOpen, setInstrumentOpen] = useState(true);
  const [instrumentHeight, setInstrumentHeight] = useState(300);
  const resizingRef = useRef(false);

  useEffect(() => {
    const onPointerMove = event => {
      if (!resizingRef.current) return;
      const shell = document.querySelector('[data-testid="electrical-workspace"]');
      if (!shell) return;
      const rect = shell.getBoundingClientRect();
      setInstrumentHeight(Math.min(520, Math.max(190, rect.bottom - event.clientY - 18)));
    };
    const onPointerUp = () => {
      resizingRef.current = false;
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => { window.removeEventListener("pointermove", onPointerMove); window.removeEventListener("pointerup", onPointerUp); };
  }, []);

  const beginResize = event => {
    if (!instrumentOpen || focusMode) return;
    event.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  };

  return <div data-testid="electrical-workspace" data-focus-mode={focusMode ? "true" : "false"} className="flex h-full min-h-0 flex-col overflow-hidden bg-[#eef1f4] text-[#17253a]">
    <header className="relative z-50 flex h-12 shrink-0 items-center border-b border-[#d8dde4] bg-[#f8fafb]/95 px-3 shadow-[0_1px_8px_rgba(24,37,58,0.05)] backdrop-blur">
      <div className="flex min-w-0 shrink-0 items-center gap-3"><div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#17253a] text-[8px] font-bold tracking-[0.08em] text-white">LO</div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#536174]">Lab OS</div></div><div className="h-5 w-px bg-[#d9dee5]"/><div className="min-w-0 truncate text-[11px] font-semibold text-[#26364d]">Electrical Workspace</div></div>
      <div data-testid="workspace-header-context" className="min-w-0 flex-1 px-5">{headerCenter}</div>
      <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-[#dce1e7] bg-[#eef1f4] p-0.5">{!focusMode && <><SurfaceToggle label="Library" active={libraryOpen} onClick={() => setLibraryOpen(value => !value)} /><SurfaceToggle label="Inspector" active={inspectorOpen} onClick={() => setInspectorOpen(value => !value)} /><SurfaceToggle label="Instruments" active={instrumentOpen} onClick={() => setInstrumentOpen(value => !value)} /></>}<button type="button" onClick={() => setFocusMode(value => !value)} className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-[10px] font-semibold text-[#33445a] shadow-sm transition hover:bg-[#fdfefe]">{focusMode ? "Exit focus" : "Focus"}</button></div>
    </header>

    <div className="relative min-h-0 flex-1 overflow-hidden p-2">
      <main data-testid="workspace-canvas-surface" className="absolute inset-2 overflow-hidden rounded-xl border border-[#d9dee5] bg-[#f7f8f6] shadow-[0_4px_20px_rgba(24,37,58,0.07)]">{children}</main>
      {!focusMode && libraryOpen && <aside data-testid="workspace-library-surface" className="absolute bottom-5 left-5 top-5 z-30 flex w-[300px] flex-col overflow-hidden rounded-xl border border-[#d8dee6] bg-[#fbfcfd]/96 shadow-[0_12px_35px_rgba(24,37,58,0.13)] backdrop-blur">{library}</aside>}
      {!focusMode && inspectorOpen && <aside data-testid="workspace-inspector-surface" className="absolute bottom-5 right-5 top-5 z-30 flex w-[320px] flex-col overflow-hidden rounded-xl border border-[#d8dee6] bg-[#fbfcfd]/96 shadow-[0_12px_35px_rgba(24,37,58,0.13)] backdrop-blur">{inspector}</aside>}
      {!focusMode && instrumentOpen && <section data-testid="workspace-instrument-surface" style={{ height: instrumentHeight }} className="absolute bottom-5 left-5 right-5 z-40 overflow-hidden rounded-xl border border-[#d8dee6] bg-[#fbfcfd]/98 shadow-[0_14px_40px_rgba(24,37,58,0.16)] backdrop-blur">{instrument}</section>}
      {!focusMode && instrumentOpen && <div data-testid="instrument-resize-handle" role="separator" aria-label="Resize instrument panel" aria-orientation="horizontal" onPointerDown={beginResize} style={{ bottom: instrumentHeight + 12 }} className="absolute left-1/2 z-50 flex h-4 w-20 -translate-x-1/2 cursor-ns-resize items-center justify-center rounded-full border border-[#d0d7df] bg-white/95 shadow-sm"><span className="h-1 w-8 rounded-full bg-[#aeb8c4]" /></div>}
    </div>
  </div>;
}
