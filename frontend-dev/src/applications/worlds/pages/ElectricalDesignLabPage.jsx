import { useMemo, useRef, useState } from "react";
import {
  Activity,
  Box,
  ChevronDown,
  CircleDot,
  Crosshair,
  FilePlus2,
  FolderOpen,
  Gauge,
  Grid2X2,
  Hand,
  HelpCircle,
  LibraryBig,
  MousePointer2,
  Play,
  Redo2,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  Waves,
  X,
  Zap,
} from "lucide-react";
import {
  createDesignLabState,
  DESIGN_LAB_COMPONENTS,
  selectComponent,
  setMode,
  togglePanel,
  moveComponent,
  setTool,
  connectPort,
  deleteComponent,
  startPlacement,
  placeComponent,
  updateComponentValue,
} from "../model/electricalDesignLab.js";

const MODE_LABELS = { design: "Design", simulate: "Simulate", analyze: "Analyze" };

function IconButton({ label, active = false, children, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg transition ${active ? "bg-slate-100 text-slate-950 shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
    >
      {children}
    </button>
  );
}

function ComponentSymbol({ kind, selected }) {
  const stroke = selected ? "#2563eb" : "#18212b";
  if (kind === "resistor") {
    return <svg width="88" height="46" viewBox="0 0 88 46" aria-hidden="true"><path d="M2 23h17l6-10 10 20 10-20 10 20 10-20 6 10h15" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="2" cy="23" r="3" fill={stroke} /><circle cx="86" cy="23" r="3" fill={stroke} /></svg>;
  }
  if (kind === "capacitor") {
    return <svg width="88" height="46" viewBox="0 0 88 46" aria-hidden="true"><path d="M2 23h30M56 23h30M32 8v30M56 8v30" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" /><circle cx="2" cy="23" r="3" fill={stroke} /><circle cx="86" cy="23" r="3" fill={stroke} /></svg>;
  }
  return <svg width="88" height="54" viewBox="0 0 88 54" aria-hidden="true"><path d="M2 27h22M64 27h22M43 45V9" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" /><circle cx="43" cy="27" r="19" fill="white" stroke={stroke} strokeWidth="2.2" /><path d="M43 17v20M38 22h10" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" /><circle cx="2" cy="27" r="3" fill={stroke} /><circle cx="86" cy="27" r="3" fill={stroke} /></svg>;
}

function connectionPath(from, to) {
  const startX = Number.parseFloat(from.x) + (from.side === "right" ? 3 : -3);
  const startY = Number.parseFloat(from.y);
  const endX = Number.parseFloat(to.x) + (to.side === "right" ? 3 : -3);
  const endY = Number.parseFloat(to.y);
  const middleX = Number(((startX + endX) / 2).toFixed(2));

  if (startY === endY) {
    return `M ${startX} ${startY} H ${endX}`;
  }

  return `M ${startX} ${startY} H ${middleX} V ${endY} H ${endX}`;
}

function SchematicNode({ component, selected, tool, wireStart, onClick, onPointerDown, onPointerMove, onPointerUp, onPortClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`design-lab-node-${component.id}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onClick();
      }}
      onPointerDown={(event) => onPointerDown(component.id, event)}
      onPointerMove={(event) => onPointerMove(component.id, event)}
      onPointerUp={(event) => onPointerUp(component.id, event)}
      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none text-left outline-none active:cursor-grabbing ${selected ? "z-20" : "z-10"}`}
      style={{ left: component.x, top: component.y }}
    >
      <div className={`relative rounded-xl px-3 py-2 transition ${selected ? "bg-white/95 ring-2 ring-blue-500/25 shadow-lg" : "hover:bg-white/70"}`}>
        <ComponentSymbol kind={component.kind} selected={selected} />
        <div className="mt-1 flex items-center justify-between gap-8 px-1 text-[11px]">
          <span className={`font-semibold ${selected ? "text-blue-600" : "text-slate-800"}`}>{component.id}</span>
          <span className="text-slate-400">{component.value}</span>
        </div>
        {tool === "wire" && (
          <>
            {["left", "right"].map((side) => {
              const active = wireStart?.componentId === component.id && wireStart.side === side;
              return (
                <button
                  key={side}
                  type="button"
                  data-testid={`design-lab-port-${component.id}-${side}`}
                  aria-label={`${component.id} ${side} port`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onPortClick(component.id, side);
                  }}
                  className={`absolute top-[30px] h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white shadow-sm transition ${active ? "bg-blue-600 ring-4 ring-blue-100" : "bg-slate-500 hover:bg-blue-500"} ${side === "left" ? "-left-1.5" : "-right-1.5"}`}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

export default function ElectricalDesignLabPage() {
  const [state, setState] = useState(createDesignLabState);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const historyRef = useRef([]);
  const futureRef = useRef([]);

  const components = useMemo(() => [...DESIGN_LAB_COMPONENTS, ...state.placedComponents]
    .filter((component) => !state.deletedComponents.includes(component.id))
    .map((component) => ({
      ...component,
      value: state.values[component.id] ?? component.value,
      x: `${state.positions[component.id].x}%`,
      y: `${state.positions[component.id].y}%`,
    })), [state.deletedComponents, state.placedComponents, state.positions, state.values]);

  const filtered = DESIGN_LAB_COMPONENTS.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  const selected = components.find((item) => item.id === state.selectedComponent);

  const changeMode = (mode) => setState((current) => setMode(current, mode));
  const choose = (id) => setState((current) => selectComponent(current, id));
  const toggle = (panel) => setState((current) => togglePanel(current, panel));
  const chooseTool = (tool) => setState((current) => setTool(current, tool));
  const beginPlacement = (kind) => setState((current) => startPlacement(current, kind));

  const commitEdit = (updater) => {
    setState((current) => {
      const next = updater(current);
      if (next === current) return current;
      historyRef.current.push(current);
      futureRef.current = [];
      return next;
    });
  };

  const undo = () => {
    setState((current) => {
      const previous = historyRef.current.pop();
      if (!previous) return current;
      futureRef.current.push(current);
      return previous;
    });
  };

  const redo = () => {
    setState((current) => {
      const next = futureRef.current.pop();
      if (!next) return current;
      historyRef.current.push(current);
      return next;
    });
  };

  const choosePort = (componentId, side) => commitEdit((current) => connectPort(current, componentId, side));
  const handleCanvasClick = (event) => {
    if (!state.placementKind || !canvasRef.current) return;
    if (event.target.closest?.("button,[role='button']")) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = zoom / 100;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = ((event.clientX - rect.left - centerX) / scale + centerX) / rect.width * 100;
    const y = ((event.clientY - rect.top - centerY) / scale + centerY) / rect.height * 100;
    commitEdit((current) => placeComponent(current, x, y));
  };

  const handleCanvasKeyDown = (event) => {
    if ((event.key === "Backspace" || event.key === "Delete") && state.selectedComponent) {
      event.preventDefault();
      commitEdit((current) => deleteComponent(current, current.selectedComponent));
    }
  };

  const handlePointerDown = (componentId, event) => {
    if (event.button !== 0 || !canvasRef.current) return;
    const position = state.positions[componentId];
    if (!position) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragRef.current = {
      componentId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: position.x,
      startY: position.y,
      width: rect.width,
      height: rect.height,
      zoom: zoom / 100,
      startState: state,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    choose(componentId);
  };

  const handlePointerMove = (componentId, event) => {
    const drag = dragRef.current;
    if (!drag || drag.componentId !== componentId) return;
    const deltaX = ((event.clientX - drag.startClientX) / (drag.width * drag.zoom)) * 100;
    const deltaY = ((event.clientY - drag.startClientY) / (drag.height * drag.zoom)) * 100;
    setState((current) => moveComponent(current, componentId, drag.startX + deltaX, drag.startY + deltaY));
  };

  const handlePointerUp = (componentId, event) => {
    if (dragRef.current?.componentId !== componentId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const finalPosition = state.positions[componentId];
    if (
      finalPosition &&
      (finalPosition.x !== drag.startX || finalPosition.y !== drag.startY)
    ) {
      historyRef.current.push(drag.startState);
      futureRef.current = [];
    }
  };

  return (
    <main data-testid="electrical-design-lab" className="h-screen min-h-[720px] w-full overflow-hidden bg-[#f7f8fa] text-[#17212b] selection:bg-blue-100">
      <header className="flex h-14 items-center border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xl">
        <div className="flex min-w-[250px] items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-950 text-white"><Zap size={16} strokeWidth={2.2} /></div>
          <div className="leading-none"><div className="text-[13px] font-semibold tracking-tight">LAB OS</div><div className="mt-1 text-[10px] text-slate-400">Worlds / Electrical</div></div>
          <ChevronDown size={13} className="ml-1 text-slate-400" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-medium shadow-sm">
            {Object.entries(MODE_LABELS).map(([mode, label]) => <button key={mode} type="button" onClick={() => changeMode(mode)} className={`rounded-md px-4 py-1.5 transition ${state.mode === mode ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}>{label}</button>)}
          </div>
        </div>
        <div className="flex min-w-[250px] items-center justify-end gap-1">
          <span className="mr-3 flex items-center gap-1.5 text-[10px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Saved</span>
          <IconButton label="Undo" onClick={undo}><Undo2 size={15} /></IconButton><IconButton label="Redo" onClick={redo}><Redo2 size={15} /></IconButton>
          <div className="mx-2 h-5 w-px bg-slate-200" />
          <IconButton label="Settings"><Settings2 size={16} /></IconButton><IconButton label="Help"><HelpCircle size={16} /></IconButton>
          <div className="ml-2 grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-[10px] font-semibold">JV</div>
        </div>
      </header>

      <div className="relative flex h-[calc(100vh-56px)] min-h-0">
        <nav className="z-40 flex w-14 shrink-0 flex-col items-center border-r border-slate-200/80 bg-white py-3">
          <IconButton label="Select" active><MousePointer2 size={17} /></IconButton>
          <IconButton label="Pan"><Hand size={17} /></IconButton>
          <div className="my-3 h-px w-6 bg-slate-200" />
          <IconButton label="Library" active={state.libraryOpen} onClick={() => toggle("library")}><LibraryBig size={17} /></IconButton>
          <IconButton label="Inspector" active={state.inspectorOpen} onClick={() => toggle("inspector")}><SlidersHorizontal size={17} /></IconButton>
          <IconButton label="Instruments" active={state.resultsOpen} onClick={() => toggle("results")}><Gauge size={17} /></IconButton>
          <div className="mt-auto"><IconButton label="Workspace settings"><Settings2 size={17} /></IconButton></div>
        </nav>

        <section ref={canvasRef} tabIndex={-1} onClick={handleCanvasClick} onKeyDown={handleCanvasKeyDown} className="relative min-w-0 flex-1 overflow-hidden bg-[#fafbfc]" data-testid="design-lab-canvas">
          <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(#cbd5e1 0.65px, transparent 0.65px)", backgroundSize: "24px 24px" }} />
          {state.placementKind && (
            <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-lg border border-blue-200 bg-white/95 px-3 py-1.5 text-[10px] font-medium text-blue-700 shadow-sm backdrop-blur-xl">
              Click on the schematic to place {state.placementKind === "source" ? "Voltage Source" : state.placementKind === "resistor" ? "Resistor" : "Capacitor"}
            </div>
          )}

          <div className="absolute left-1/2 top-5 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-slate-200/90 bg-white/90 p-1 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <IconButton label="Select tool" active={state.tool === "select"} onClick={() => chooseTool("select")}><MousePointer2 size={15} /></IconButton><IconButton label="Wire tool" active={state.tool === "wire"} onClick={() => chooseTool("wire")}><Activity size={15} /></IconButton><IconButton label="Add component" onClick={() => toggle("library")}><Box size={15} /></IconButton><IconButton label="Junction"><CircleDot size={15} /></IconButton><div className="mx-1 h-5 w-px bg-slate-200" /><IconButton label="Fit schematic"><Crosshair size={15} /></IconButton>
          </div>

          <div className="absolute left-7 top-7 z-20 text-[11px] text-slate-400"><span className="font-medium text-slate-600">Untitled circuit</span><span className="mx-2">/</span> Schematic</div>
          <div className="absolute bottom-7 left-7 z-20 flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white/90 px-2 py-1 text-[10px] text-slate-400 shadow-sm backdrop-blur-xl">
            <span className="font-medium text-slate-600">{zoom}%</span><button type="button" onClick={() => setZoom((v) => Math.max(50, v - 10))}>−</button><button type="button" onClick={() => setZoom((v) => Math.min(200, v + 10))}>+</button>
          </div>

          <div data-testid="design-lab-schematic-viewport" className="absolute inset-0 origin-center transition-transform duration-200 ease-out" style={{ transform: `scale(${zoom / 100})` }}>
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {state.connections.map((connection) => {
                const from = components.find((item) => item.id === connection.from.componentId);
                const to = components.find((item) => item.id === connection.to.componentId);
                if (!from || !to) return null;
                return (
                  <path
                    key={`${connection.from.componentId}-${connection.from.side}-${connection.to.componentId}-${connection.to.side}`}
                    data-testid={`design-lab-connection-${connection.from.componentId}-${connection.to.componentId}`}
                    data-from-side={connection.from.side}
                    data-to-side={connection.to.side}
                    d={connectionPath(
                      { x: from.x, y: from.y, side: connection.from.side },
                      { x: to.x, y: to.y, side: connection.to.side }
                    )}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="0.18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
            </svg>
            {components.map((component) => (
              <SchematicNode
                key={component.id}
                component={component}
                selected={component.id === state.selectedComponent}
                tool={state.tool}
                wireStart={state.wireStart}
                onClick={() => choose(component.id)}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPortClick={choosePort}
              />
            ))}
          </div>

          {state.selectedComponent && selected && (
            <div className="absolute left-1/2 top-[57%] z-30 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-[0_10px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl">
              <span className="px-2 text-[10px] font-semibold text-slate-700">{selected.id}</span><button type="button" className="rounded-md px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100">Duplicate</button><button type="button" className="rounded-md px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100">Rotate</button><button type="button" onClick={() => choose(null)} className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100"><X size={13} /></button>
            </div>
          )}
        </section>

        {state.libraryOpen && (
          <aside className="absolute left-[70px] top-4 z-50 w-[286px] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.14)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><div className="text-[12px] font-semibold">Component library</div><div className="mt-0.5 text-[10px] text-slate-400">Place an element on the schematic</div></div><button type="button" onClick={() => toggle("library")} className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100"><X size={14} /></button></div>
            <div className="p-3"><div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3"><Search size={14} className="text-slate-400" /><input aria-label="Search components" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search components" className="w-full bg-transparent text-[11px] outline-none placeholder:text-slate-400" /></div></div>
            <div className="max-h-[430px] overflow-auto px-2 pb-3">
              <div className="px-2 pb-2 pt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Basic</div>
              {filtered.map((component) => <button key={component.id} type="button" onClick={() => beginPlacement(component.kind)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-slate-50"><div className="grid h-10 w-12 place-items-center rounded-lg bg-slate-50"><ComponentSymbol kind={component.kind} /></div><div className="min-w-0"><div className="text-[11px] font-medium text-slate-800">{component.name}</div><div className="mt-0.5 text-[10px] text-slate-400">{component.value}</div></div><Sparkles size={12} className="ml-auto text-slate-300" /></button>)}
            </div>
          </aside>
        )}

        {state.inspectorOpen && selected && (
          <aside data-testid="design-lab-inspector" className="absolute right-4 top-4 z-50 w-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.14)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><div className="text-[12px] font-semibold">{selected.id} · {selected.name}</div><div className="mt-0.5 text-[10px] text-slate-400">Component properties</div></div><button type="button" onClick={() => toggle("inspector")} className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100"><X size={14} /></button></div>
            <div className="space-y-5 p-4"><div><label className="text-[10px] font-medium text-slate-500">Reference</label><div className="mt-1.5 flex h-8 items-center rounded-lg border border-slate-200 px-2.5 text-[11px]">{selected.id}</div></div><div><label className="text-[10px] font-medium text-slate-500">Value</label><input key={selected.id} data-testid="design-lab-property-value" aria-label="Component value" defaultValue={selected.value} onBlur={(event) => commitEdit((current) => updateComponentValue(current, selected.id, event.target.value))} className="mt-1.5 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></div><div className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600"><Grid2X2 size={13} /> Geometry</div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-400"><div>X <span className="float-right text-slate-600">49.0%</span></div><div>Y <span className="float-right text-slate-600">46.0%</span></div></div></div></div>
          </aside>
        )}

        {state.resultsOpen && (
          <div data-testid="design-lab-results" className="absolute bottom-4 left-20 right-4 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.14)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div className="flex items-center gap-3"><div className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100"><Waves size={14} /></div><div><div className="text-[12px] font-semibold">Simulation results</div><div className="text-[10px] text-slate-400">Transient · 0–10 ms</div></div></div><div className="flex items-center gap-1"><button type="button" className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 text-[10px] font-medium text-white"><Play size={11} /> Run</button><button type="button" onClick={() => toggle("results")} className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100"><X size={14} /></button></div></div>
            <div className="grid grid-cols-4 gap-px bg-slate-100"><div className="bg-white px-4 py-3"><div className="text-[9px] uppercase tracking-wider text-slate-400">Vout</div><div className="mt-1 text-sm font-semibold">4.82 V</div></div><div className="bg-white px-4 py-3"><div className="text-[9px] uppercase tracking-wider text-slate-400">Current</div><div className="mt-1 text-sm font-semibold">4.82 mA</div></div><div className="bg-white px-4 py-3"><div className="text-[9px] uppercase tracking-wider text-slate-400">Settling</div><div className="mt-1 text-sm font-semibold">8.4 ms</div></div><div className="bg-white px-4 py-3"><div className="text-[9px] uppercase tracking-wider text-slate-400">Status</div><div className="mt-1 flex items-center gap-1.5 text-sm font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Stable</div></div></div>
          </div>
        )}
      </div>
    </main>
  );
}
