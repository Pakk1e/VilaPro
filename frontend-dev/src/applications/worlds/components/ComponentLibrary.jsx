import { useMemo, useState } from "react";
import { worldDefinitions } from "../model/worldDefinitions";
import { WORLD_EXAMPLES } from "../model/worldExamples";
import { getSimulationAnalysisLabel } from "../model/simulationConfig";
import ComponentSymbolPreview from "./ComponentSymbolPreview";

const GROUPS = [["Basic", ["Resistor", "Capacitor", "Inductor"]], ["Sources", ["Voltage Source", "Current Source"]], ["References", ["Ground"]], ["Diodes", ["Diode"]], ["Transistors", ["NPN Transistor", "PNP Transistor"]], ["MOSFETs", ["NMOS", "PMOS"]]];
function emit(name, detail) { window.dispatchEvent(new CustomEvent(name, { detail })); }

function SectionLabel({ children, count }) {
  return <div className="mb-2 flex items-center justify-between"><div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#69788a]">{children}</div>{count !== undefined && <span className="rounded-full bg-[#edf1f5] px-1.5 py-0.5 text-[8px] font-semibold tabular-nums text-[#8a95a2]">{count}</span>}</div>;
}

export default function ComponentLibrary() {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState([]);
  const normalized = query.trim().toLowerCase();
  const definitions = useMemo(() => Object.entries(worldDefinitions).filter(([, definition]) => !normalized || `${definition.type} ${definition.description ?? ""}`.toLowerCase().includes(normalized)), [normalized]);
  const visibleExamples = WORLD_EXAMPLES.filter(example => !normalized || `${example.label} ${example.description}`.toLowerCase().includes(normalized));
  const recentDefinitions = recent.map(key => [key, worldDefinitions[key]]).filter(([, definition]) => definition && (!normalized || `${definition.type} ${definition.description ?? ""}`.toLowerCase().includes(normalized)));
  const addComponent = key => { setRecent(current => [key, ...current.filter(item => item !== key)].slice(0, 5)); emit("worlds:add-component", key); };

  return <div data-testid="component-library" className="flex h-full min-h-0 flex-col bg-[#fbfcfd]">
    <div className="shrink-0 border-b border-[#e3e7ec] px-4 pb-3 pt-4">
      <div className="flex items-end justify-between"><div><div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#8390a0]">Build</div><div className="mt-0.5 text-sm font-semibold text-[#1d2b40]">Components</div></div><div className="rounded-md bg-[#edf1f5] px-2 py-1 text-[8px] font-semibold text-[#7a8797]">{definitions.length} available</div></div>
      <div className="relative mt-3"><span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9ba5b1]">⌕</span><input aria-label="Search components" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search components" className="h-9 w-full rounded-lg border border-[#d6dde5] bg-white pl-7 pr-3 text-[11px] text-[#26364d] outline-none transition placeholder:text-[#a0a9b4] focus:border-[#9aaabc] focus:ring-2 focus:ring-[#dfe5eb]" /></div>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
      {recentDefinitions.length > 0 && <section className="mb-4"><SectionLabel>Recent</SectionLabel><div className="grid grid-cols-2 gap-1.5">{recentDefinitions.map(([key, definition]) => <button key={key} type="button" aria-label={`${definition.type} Add to canvas`} onClick={() => addComponent(key)} className="group flex min-h-[66px] flex-col items-center justify-center rounded-lg border border-[#dce2e8] bg-white p-1.5 text-center shadow-[0_1px_2px_rgba(24,37,58,0.03)] transition hover:-translate-y-px hover:border-[#b9c4d0] hover:shadow-sm"><ComponentSymbolPreview type={definition.type} className="h-8 w-16"/><span className="mt-1 truncate text-[9px] font-semibold text-[#405067]">{definition.type}</span></button>)}</div></section>}

      <section data-testid="world-examples" className="mb-4 rounded-lg border border-[#e1e6eb] bg-white p-2.5 shadow-[0_1px_2px_rgba(24,37,58,0.025)]"><SectionLabel count={visibleExamples.length}>Examples</SectionLabel><div className="space-y-1">{visibleExamples.slice(0, 5).map(example => <button key={example.id} type="button" onClick={() => emit("worlds:load-example", example)} className="group w-full rounded-md px-2 py-2 text-left transition hover:bg-[#f4f7f9]"><div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[#2d3d54]">{example.label}</span><span className="shrink-0 rounded bg-[#eef2f5] px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.06em] text-[#708096]">{getSimulationAnalysisLabel(example.simulationPreset.analysis)}</span></div><div className="mt-0.5 line-clamp-1 text-[8px] leading-4 text-[#929ca8]">{example.description}</div></button>)}</div>{visibleExamples.length > 5 && <div className="px-2 pt-1 text-[8px] text-[#9aa3ad]">Scroll for more examples</div>}</section>

      <section data-testid="component-palette"><SectionLabel>Library</SectionLabel>{GROUPS.map(([group, types]) => { const entries = definitions.filter(([, definition]) => types.includes(definition.type)); if (!entries.length) return null; return <div key={group} className="mb-4"><div className="mb-1.5 px-1 text-[8px] font-bold uppercase tracking-[0.14em] text-[#9aa3ad]">{group}</div><div className="grid grid-cols-2 gap-1.5">{entries.map(([key, definition]) => <button key={key} type="button" aria-label={`${definition.type} Add to canvas`} onClick={() => addComponent(key)} className="group flex min-h-[76px] flex-col items-center justify-center rounded-lg border border-[#dde3e9] bg-white p-1.5 text-center transition hover:-translate-y-px hover:border-[#b7c2ce] hover:bg-[#fbfcfd] hover:shadow-[0_4px_12px_rgba(24,37,58,0.07)]"><ComponentSymbolPreview type={definition.type} className="h-9 w-16"/><span className="mt-1 truncate text-[9px] font-semibold text-[#405067]">{definition.type}</span></button>)}</div></div>; })}</section>
    </div>
  </div>;
}
