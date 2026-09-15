import { useEffect, useState } from "react";
import { worldDefinitions } from "../model/worldDefinitions";
import ComponentPropertiesPanel from "./ComponentPropertiesPanel";

function addProbe(node, measurement, terminal = null) {
  if (!node) return;
  window.dispatchEvent(new CustomEvent("worlds:add-probe", { detail: { entityType: terminal ? "terminal" : "component", entityId: terminal ? `${node.id}:${terminal.id}` : node.id, nodeId: node.id, terminalId: terminal?.id ?? null, measurement, label: terminal ? `${node.data?.label ?? "Component"} · ${terminal.label ?? terminal.id}` : node.data?.label ?? "Component" } }));
}

function ProbeButton({ label, onClick, disabled = false }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="rounded-md border border-[#d3dae2] bg-white px-2.5 py-1.5 text-[9px] font-semibold text-[#405067] shadow-[0_1px_2px_rgba(24,37,58,0.03)] transition hover:border-[#aeb9c6] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-35">{label}</button>;
}

function ProbeRow({ label, measurement, onRemove }) {
  return <div className="flex items-center gap-2 rounded-md bg-[#f3f6f8] px-2.5 py-2"><div className="min-w-0 flex-1"><div className="truncate text-[9px] font-semibold text-[#405067]">{label}</div><div className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-[#8290a1]">{measurement}</div></div><button type="button" aria-label={`Remove ${label} ${measurement} probe`} onClick={onRemove} className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-sm leading-none text-[#8b96a3] hover:bg-white hover:text-[#405067]">×</button></div>;
}

function InspectorHeader({ eyebrow, title, meta }) {
  return <div className="border-b border-[#e2e7ec] px-4 py-4"><div className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#8a96a4]">{eyebrow}</div><div className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-[#1d2b40]">{title}</div>{meta && <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-[#708096]">{meta}</div>}</div>;
}

function Section({ title, children }) {
  return <section className="border-b border-[#e5e9ed] px-4 py-3.5 last:border-b-0"><div className="mb-2 text-[8px] font-bold uppercase tracking-[0.16em] text-[#8a96a4]">{title}</div>{children}</section>;
}

export default function WorkspaceInspector() {
  const [selection, setSelection] = useState({ selectedNode: null, selectedEdgeId: null, selectedTerminal: null, selectedResultEntity: null });
  const [probes, setProbes] = useState([]);
  useEffect(() => { const handler = event => setSelection(event.detail ?? {}); window.addEventListener("worlds:selection-change", handler); return () => window.removeEventListener("worlds:selection-change", handler); }, []);
  useEffect(() => { const handler = event => { const probe = event.detail; if (!probe?.entityId || !probe?.measurement) return; setProbes(current => current.some(item => item.entityId === probe.entityId && item.measurement === probe.measurement) ? current : [...current, probe]); }; const removeHandler = event => { const probe = event.detail; if (!probe?.entityId || !probe?.measurement) return; setProbes(current => current.filter(item => !(item.entityId === probe.entityId && item.measurement === probe.measurement))); }; window.addEventListener("worlds:add-probe", handler); window.addEventListener("worlds:remove-probe", removeHandler); return () => { window.removeEventListener("worlds:add-probe", handler); window.removeEventListener("worlds:remove-probe", removeHandler); }; }, []);
  const node = selection.selectedNode;
  const definition = node?.data?.definitionKey ? worldDefinitions[node.data.definitionKey] : null;
  const terminal = selection.selectedTerminal?.port;
  const update = (property, value) => window.dispatchEvent(new CustomEvent("worlds:update-property", { detail: { nodeId: node?.id, property, value } }));
  const removeProbe = (entityId, measurement) => window.dispatchEvent(new CustomEvent("worlds:remove-probe", { detail: { entityId, measurement } }));
  const clearSelection = () => window.dispatchEvent(new CustomEvent("worlds:selection-change", { detail: { selectedNode: null, selectedEdgeId: null, selectedTerminal: null, selectedResultEntity: null } }));

  if (terminal && node) return <div data-testid="workspace-inspector" className="flex h-full min-h-0 flex-col overflow-y-auto bg-[#fbfcfd]"><InspectorHeader eyebrow="Terminal" title={terminal.label ?? terminal.id} meta={node.data?.label ?? "Component"}/><Section title="Connection"><div className="grid grid-cols-[64px_1fr] gap-y-2 text-[9px]"><span className="text-[#8c97a4]">Port</span><span className="font-mono text-[#405067]">{terminal.id}</span><span className="text-[#8c97a4]">Kind</span><span className="text-[#405067]">{terminal.kind}</span><span className="text-[#8c97a4]">Position</span><span className="text-[#405067]">{terminal.position}</span></div></Section><Section title="Measure"><div className="flex flex-wrap gap-1.5"><ProbeButton label="Voltage" onClick={() => addProbe(node, "voltage", terminal)}/><ProbeButton label="Current" disabled={terminal.kind !== "electrical"} onClick={() => addProbe(node, "current", terminal)}/><ProbeButton label="Power" disabled={terminal.kind !== "electrical"} onClick={() => addProbe(node, "power", terminal)}/></div><p className="mt-2 text-[8px] leading-4 text-[#8d98a5]">Add a quantity to Instruments for analysis.</p></Section><div className="mt-auto px-4 py-3"><button type="button" onClick={clearSelection} className="rounded-md px-2 py-1.5 text-[8px] font-semibold text-[#7d8997] hover:bg-[#f1f4f6] hover:text-[#405067]">Clear selection</button></div></div>;

  if (selection.selectedResultEntity && !node) return <div data-testid="workspace-inspector" className="h-full overflow-y-auto bg-[#fbfcfd]"><InspectorHeader eyebrow="Result" title={selection.selectedResultEntity.label ?? selection.selectedResultEntity.entityId}/><Section title="Linked quantity"><p className="text-[9px] leading-5 text-[#7f8b99]">This result is linked to the corresponding circuit quantity. Use Instruments for waveform and measurement details.</p></Section></div>;

  if (selection.selectedEdgeId) return <div data-testid="workspace-inspector" className="h-full overflow-y-auto bg-[#fbfcfd]"><InspectorHeader eyebrow="Connection" title="Wire / net" meta={selection.selectedEdgeId}/><Section title="Topology"><p className="text-[9px] leading-5 text-[#7f8b99]">This connection belongs to the circuit graph. Select a component or terminal for contextual editing and measurements.</p></Section></div>;

  if (!node) return <div data-testid="workspace-inspector" className="flex h-full min-h-0 flex-col bg-[#fbfcfd]"><div className="flex flex-1 items-center justify-center px-8 text-center"><div><div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-[#dce2e8] bg-white text-[#8d99a6]">⌁</div><div className="mt-3 text-[10px] font-semibold text-[#667589]">Nothing selected</div><div className="mt-1 text-[8px] leading-4 text-[#9aa4af]">Select a component, terminal, wire, or result to inspect it.</div></div></div>{probes.length > 0 && <Section title="Active probes"><div className="space-y-1.5">{probes.map(probe => <ProbeRow key={`${probe.entityId}:${probe.measurement}`} label={probe.label} measurement={probe.measurement} onRemove={() => removeProbe(probe.entityId, probe.measurement)}/>)}</div></Section>}</div>;

  return <div data-testid="workspace-inspector" className="flex h-full min-h-0 flex-col overflow-y-auto bg-[#fbfcfd]"><InspectorHeader eyebrow="Component" title={node.data?.label ?? "Unnamed"} meta={node.data?.componentType ?? "Component"}/><Section title="Properties"><ComponentPropertiesPanel definition={definition} properties={node.data?.properties ?? {}} onChange={update}/></Section><Section title="Measure"><div className="flex flex-wrap gap-1.5"><ProbeButton label="Voltage" onClick={() => addProbe(node, "voltage")}/><ProbeButton label="Current" onClick={() => addProbe(node, "current")}/><ProbeButton label="Power" onClick={() => addProbe(node, "power")}/></div><p className="mt-2 text-[8px] leading-4 text-[#8d98a5]">Add a quantity to Instruments for analysis and measurement.</p></Section><Section title="Ports"><div className="space-y-1.5">{(node.data?.ports ?? []).map(port => <div key={port.id} className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5 text-[9px]"><span className="font-medium text-[#405067]">{port.label ?? port.id}</span><span className="text-[8px] text-[#8d98a5]">{port.kind}</span></div>)}</div></Section>{probes.length > 0 && <Section title="Active probes"><div className="space-y-1.5">{probes.map(probe => <ProbeRow key={`${probe.entityId}:${probe.measurement}`} label={probe.label} measurement={probe.measurement} onRemove={() => removeProbe(probe.entityId, probe.measurement)}/>)}</div></Section>}</div>;
}
