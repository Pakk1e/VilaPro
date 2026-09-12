import { useEffect, useRef, useState } from "react";

function ToolButton({ label, active, onClick }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`inline-flex h-7 items-center gap-2 border-b-2 px-2 text-[10px] font-medium transition ${active ? "border-[#26364d] text-[#26364d]" : "border-transparent text-[#7a8796] hover:border-[#c5cdd6] hover:text-[#35445a]"}`}><span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#58718f]" : "bg-[#c7ced6]"}`} />{label}</button>;
}

export default function ElectricalWorkspaceShell({ children, library, inspector, instrument, headerCenter }) {
  const [focusMode, setFocusMode] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [instrumentOpen, setInstrumentOpen] = useState(false);
  const [instrumentHeight, setInstrumentHeight] = useState(300);
  const resizingRef = useRef(false);

  useEffect(() => {
    const onPointerMove = event => {
      if (!resizingRef.current) return;
      const shell = document.querySelector('[data-testid="electrical-workspace"]');
      if (!shell) return;
      const rect = shell.getBoundingClientRect();
      setInstrumentHeight(Math.min(500, Math.max(190, rect.bottom - event.clientY - 24)));
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

  return <div data-testid="electrical-workspace" data-focus-mode={focusMode ? "true" : "false"} className="flex h-full min-h-0 flex-col overflow-hidden bg-[#e9edf1] text-[#17253a]">
    <header className="relative z-50 flex h-11 shrink-0 items-center border-b border-[#d4dae1] bg-[#f7f9fa] px-4">
      <div className="flex min-w-0 shrink-0 items-center gap-3"><div className="flex items-center gap-2"><div className="flex h-6 w-6 items-center justify-center rounded bg-[#17253a] text-[7px] font-bold tracking-[0.08em] text-white">LO</div><div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#536174]">Lab OS</div></div><div className="h-4 w-px bg-[#d7dde4]"/><div className="truncate text-[10px] font-semibold text-[#2c3b50]">Electrical</div></div>
      <div data-testid="workspace-header-context" className="min-w-0 flex-1 px-6">{headerCenter}</div>
      <div className="flex shrink-0 items-center gap-1">{!focusMode && <><ToolButton label="Library" active={libraryOpen} onClick={() => setLibraryOpen(value => !value)} /><ToolButton label="Inspector" active={inspectorOpen} onClick={() => setInspectorOpen(value => !value)} /><ToolButton label="Instruments" active={instrumentOpen} onClick={() => setInstrumentOpen(value => !value)} /></>}<button type="button" onClick={() => setFocusMode(value => !value)} className="ml-2 h-7 border border-[#cbd3dc] bg-white px-2.5 text-[10px] font-medium text-[#35445a] transition hover:border-[#aeb8c4]">{focusMode ? "Exit focus" : "Focus"}</button></div>
    </header>

    <div className="relative min-h-0 flex-1 overflow-hidden p-3">
      <main data-testid="workspace-canvas-surface" className="absolute inset-3 overflow-hidden rounded-lg border border-[#d3d9e0] bg-[#f8f9f7] shadow-[0_2px_10px_rgba(24,37,58,0.05)]">{children}</main>

      {!focusMode && libraryOpen && <aside data-testid="workspace-library-surface" className="absolute bottom-5 left-5 top-5 z-30 flex w-[340px] flex-col overflow-hidden rounded-lg border border-[#cfd6de] bg-[#fbfcfd]/98 shadow-[0_10px_28px_rgba(24,37,58,0.16)] backdrop-blur">{library}</aside>}
      {!focusMode && inspectorOpen && <aside data-testid="workspace-inspector-surface" className="absolute bottom-5 right-5 top-5 z-30 flex w-[330px] flex-col overflow-hidden rounded-lg border border-[#cfd6de] bg-[#fbfcfd]/98 shadow-[0_10px_28px_rgba(24,37,58,0.16)] backdrop-blur">{inspector}</aside>}
      {!focusMode && instrumentOpen && <section data-testid="workspace-instrument-surface" style={{ height: instrumentHeight }} className="absolute bottom-5 left-5 right-5 z-40 overflow-hidden rounded-lg border border-[#cfd6de] bg-[#fbfcfd]/99 shadow-[0_12px_32px_rgba(24,37,58,0.18)] backdrop-blur">{instrument}</section>}
      {!focusMode && instrumentOpen && <div data-testid="instrument-resize-handle" role="separator" aria-label="Resize instrument panel" aria-orientation="horizontal" onPointerDown={beginResize} style={{ bottom: instrumentHeight + 12 }} className="absolute left-1/2 z-50 flex h-4 w-16 -translate-x-1/2 cursor-ns-resize items-center justify-center rounded-full border border-[#cbd3dc] bg-white/95 shadow-sm"><span className="h-1 w-7 rounded-full bg-[#aeb8c4]" /></div>}
    </div>
  </div>;
}
