import { useMemo, useState } from "react";
import { worldDefinitions } from "../model/worldDefinitions";
import { WORLD_EXAMPLES } from "../model/worldExamples";
import { getSimulationAnalysisLabel } from "../model/simulationConfig";
import ComponentSymbolPreview from "./ComponentSymbolPreview";

const GROUPS = [["Sources", ["Voltage Source", "Current Source"]], ["Passive", ["Resistor", "Capacitor", "Inductor"]], ["References", ["Ground"]], ["Semiconductors", ["Diode", "NPN Transistor", "PNP Transistor", "NMOS", "PMOS"]]];
function emit(name, detail) { window.dispatchEvent(new CustomEvent(name, { detail })); }

export default function ComponentLibrary() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const definitions = useMemo(() => Object.entries(worldDefinitions).filter(([, definition]) => !normalized || `${definition.type} ${definition.description ?? ""}`.toLowerCase().includes(normalized)), [normalized]);
  return <div data-testid="component-library" className="flex h-full min-h-0 flex-col">
    <div className="shrink-0 border-b border-[#e3e6ea] px-3 py-3"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#596777]">Component Library</div><input aria-label="Search components" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search components..." className="mt-2 h-8 w-full border border-[#cfd5dc] bg-white px-2.5 text-xs text-[#26364d] outline-none focus:border-[#8797aa]"/></div>
    <div className="min-h-0 flex-1 overflow-y-auto">
      <section data-testid="world-examples" className="border-b border-[#e3e6ea] px-3 py-3"><div className="mb-2 flex items-center justify-between"><div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#69717b]">Examples</div><span className="text-[9px] text-[#9aa2ab]">{WORLD_EXAMPLES.length}</span></div><div className="space-y-1">{WORLD_EXAMPLES.filter(example=>!normalized||`${example.label} ${example.description}`.toLowerCase().includes(normalized)).map(example=><button key={example.id} type="button" onClick={()=>emit("worlds:load-example", example)} className="w-full border border-transparent px-2.5 py-2 text-left hover:border-[#d9dde2] hover:bg-white"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-medium text-[#26364d]">{example.label}</span><span className="shrink-0 text-[8px] font-semibold uppercase text-[#667f9c]">{getSimulationAnalysisLabel(example.simulationPreset.analysis)}</span></div><div className="mt-0.5 line-clamp-2 text-[9px] leading-4 text-[#8a929c]">{example.description}</div></button>)}</div></section>
      <section data-testid="component-palette" className="px-3 py-3"><div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#69717b]">Components</div>{GROUPS.map(([group, types])=>{const entries=definitions.filter(([,definition])=>types.includes(definition.type));if(!entries.length)return null;return <div key={group} className="mb-4"><div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8a929c]">{group}</div><div className="space-y-1">{entries.map(([key,definition])=><button key={key} type="button" aria-label={`${definition.type} Add to canvas`} onClick={()=>emit("worlds:add-component", key)} className="flex w-full items-center gap-2 border border-[#d9dde2] bg-white px-2 py-1.5 text-left hover:border-[#9ea8b4] hover:bg-[#f8fafc]"><ComponentSymbolPreview type={definition.type}/><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-medium text-[#26364d]">{definition.type}</span><span className="block text-[8px] text-[#8a929c]">Click to place</span></span></button>)}</div></div>})}</section>
    </div>
  </div>;
}
