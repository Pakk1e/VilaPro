import { useMemo } from "react";

import { buildCircuitDescription } from "../model/worldGraphSerializer";
import { generateSchematic, getSchematicPort } from "../model/schematicGenerator";

const TERMINAL_OFFSET = 92;
const STROKE = "#26364d";
const TEXT = "#17253a";
const MUTED = "#69717b";
const SELECTED = "#58718f";
const RESULT_HIGHLIGHT = "#c26a2e";
const GROUND_BUS_Y = 520;

function getSymbol(instance) {
  if (instance.type === "VoltageSource") return "voltage-source";
  if (instance.type === "Resistor") return "resistor";
  if (instance.type === "Diode") return "diode";
  return "generic";
}

function getValueLabel(instance) {
  if (instance.type === "Resistor") return `${instance.parameters?.R ?? "—"} Ω`;
  if (instance.type === "Diode") return `Vf ${instance.parameters?.Vf ?? "—"} V · ${instance.parameters?.Ron ?? "—"} Ω`;
  if (instance.type === "VoltageSource") {
    const value = instance.parameters?.V;
    if (typeof value === "number") return `${value} V DC`;
    if (value && typeof value === "object") {
      const waveform = value.waveform === "sine" ? "Sine" : value.waveform === "square" ? "Square" : "Waveform";
      const amplitude = Number(value.amplitude);
      const frequency = Number(value.frequency);
      if (Number.isFinite(amplitude) && Number.isFinite(frequency)) return `${waveform} ${amplitude} V · ${frequency} Hz`;
      return waveform;
    }
  }
  return "";
}

function SchematicSymbol({ instance, position, orientation, selected, resultHighlighted, onSelect }) {
  const symbol = getSymbol(instance);
  const value = getValueLabel(instance);
  const label = instance.name ?? "Component";
  const symbolTransform = orientation === "reversed" ? "scale(-1 1)" : undefined;
  return <g transform={`translate(${position.x} ${position.y})`} onClick={() => onSelect?.(instance.id)} className="cursor-pointer" role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect?.(instance.id); } }}>
    {resultHighlighted && <rect x="-86" y="-56" width="172" height="112" rx="10" fill="none" stroke={RESULT_HIGHLIGHT} strokeWidth="4" pointerEvents="none" />}
    {selected && !resultHighlighted && <rect x="-82" y="-52" width="164" height="104" rx="9" fill="none" stroke={SELECTED} strokeWidth="2" strokeDasharray="5 4" pointerEvents="none" />}
    <g transform={symbolTransform}>
      {symbol === "voltage-source" ? <><line x1={-TERMINAL_OFFSET} y1="0" x2="-32" y2="0" stroke={STROKE} strokeWidth="3" /><circle cx="0" cy="0" r="32" fill="white" stroke={STROKE} strokeWidth="3" /><line x1="32" y1="0" x2={TERMINAL_OFFSET} y2="0" stroke={STROKE} strokeWidth="3" /><line x1="-10" y1="-12" x2="10" y2="-12" stroke={STROKE} strokeWidth="2.5" /><line x1="0" y1="-22" x2="0" y2="-2" stroke={STROKE} strokeWidth="2.5" /><line x1="-10" y1="12" x2="10" y2="12" stroke={STROKE} strokeWidth="2.5" /></> : symbol === "resistor" ? <><line x1={-TERMINAL_OFFSET} y1="0" x2="-40" y2="0" stroke={STROKE} strokeWidth="3" /><path d="M -40 0 L -28 -14 L -10 14 L 8 -14 L 26 14 L 40 0" fill="none" stroke={STROKE} strokeWidth="4" strokeLinejoin="round" /><line x1="40" y1="0" x2={TERMINAL_OFFSET} y2="0" stroke={STROKE} strokeWidth="3" /></> : symbol === "diode" ? <><line x1={-TERMINAL_OFFSET} y1="0" x2="-24" y2="0" stroke={STROKE} strokeWidth="3" /><path d="M -24 -22 L 16 0 L -24 22 Z" fill="white" stroke={STROKE} strokeWidth="3" strokeLinejoin="round" /><line x1="16" y1="-24" x2="16" y2="24" stroke={STROKE} strokeWidth="4" /><line x1="16" y1="0" x2={TERMINAL_OFFSET} y2="0" stroke={STROKE} strokeWidth="3" /></> : <><line x1={-TERMINAL_OFFSET} y1="0" x2="-38" y2="0" stroke={STROKE} strokeWidth="3" /><rect x="-38" y="-22" width="76" height="44" rx="6" fill="white" stroke={STROKE} strokeWidth="3" /><line x1="38" y1="0" x2={TERMINAL_OFFSET} y2="0" stroke={STROKE} strokeWidth="3" /></>}
    </g>
    <text x="0" y="50" textAnchor="middle" fontSize="12" fontWeight="600" fill={TEXT} pointerEvents="none">{label}</text>{value && <text x="0" y="66" textAnchor="middle" fontSize="10" fill={MUTED} pointerEvents="none">{value}</text>}
  </g>;
}

function getResultHighlight(schematic, selectedResultEntity) {
  if (!selectedResultEntity || !schematic) return { instanceIds: new Set(), nodeId: null, branchId: null };
  if (selectedResultEntity.entityType === "component") return { instanceIds: new Set([selectedResultEntity.entityId]), nodeId: null, branchId: null };
  if (selectedResultEntity.entityType === "node") return { instanceIds: new Set(), nodeId: selectedResultEntity.entityId, branchId: null };
  if (selectedResultEntity.entityType === "branch") {
    const [firstNode, secondNode] = String(selectedResultEntity.entityId ?? "").split("->");
    const instanceIds = new Set(schematic.instances.filter((instance) => {
      const ports = instance.ports ?? {};
      return (ports.p === firstNode && ports.n === secondNode) || (ports.p === secondNode && ports.n === firstNode);
    }).map((instance) => instance.id));
    return { instanceIds, nodeId: null, branchId: selectedResultEntity.entityId };
  }
  return { instanceIds: new Set(), nodeId: null, branchId: null };
}

export default function SchematicPreview({ nodes, edges, selectedNodeId, onSelectComponent, selectedResultEntity }) {
  const schematic = useMemo(() => {
    if (!nodes.length) return null;
    try {
      const description = buildCircuitDescription(nodes, edges);
      return { ...generateSchematic(description), error: null };
    } catch (error) {
      return { instances: [], positions: new Map(), orientations: new Map(), wires: [], junctions: [], bounds: { minX: 0, minY: 0, width: 760, height: 430 }, error: error instanceof Error ? error.message : "Unable to build schematic." };
    }
  }, [edges, nodes]);
  const resultHighlight = useMemo(() => getResultHighlight(schematic, selectedResultEntity), [schematic, selectedResultEntity]);
  if (!nodes.length) return <div className="flex h-full w-[38%] min-w-0 items-center justify-center rounded-xl border border-dashed border-[#d9dde2] bg-white px-6 text-center"><div><div className="text-sm font-semibold text-[#17253a]">No circuit to preview</div><div className="mt-1 text-xs leading-5 text-[#69717b]">Build the circuit in Circuit Design and return here to see its schematic.</div></div></div>;
  const groundCenters = (schematic?.instances ?? []).filter((instance) => Object.values(instance.ports ?? {}).includes("ground")).map((instance) => schematic.positions.get(instance.id)?.x).filter((x) => Number.isFinite(x));
  const groundMinX = Math.min(...groundCenters.map((x) => x - TERMINAL_OFFSET), -20);
  const groundMaxX = Math.max(...groundCenters.map((x) => x + TERMINAL_OFFSET), 220);
  const groundSymbolX = (groundMinX + groundMaxX) / 2;
  const selectedNodeNet = resultHighlight.nodeId && schematic.netColumns.has(resultHighlight.nodeId) ? schematic.netColumns.get(resultHighlight.nodeId) : null;
  const selectedNodeEndpoints = resultHighlight.nodeId ? (schematic.netGraph.get(resultHighlight.nodeId) ?? []).map(({ instance, portId }) => { const point = getSchematicPort(instance, portId, schematic); return point ? { ...point, instanceId: instance.id, portId } : null; }).filter(Boolean) : [];
  const selectedResultLabel = selectedResultEntity?.label ?? schematic?.instances.find((instance) => instance.id === selectedResultEntity?.entityId)?.name ?? selectedResultEntity?.entityId ?? null;
  const isNodeResult = selectedResultEntity?.entityType === "node";
  const isBranchResult = selectedResultEntity?.entityType === "branch";
  return <div className="flex h-full w-[38%] min-w-0 flex-col overflow-hidden border-r border-[#d9dde2] bg-white">
    <div className="flex shrink-0 items-center justify-between border-b border-[#e4e7eb] px-4 py-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#58718f]">Circuit schematic</div><div className="mt-0.5 text-[10px] text-[#69717b]">Select a component to inspect it</div></div><div className="text-[10px] text-[#8a929c]">{schematic?.instances.length ?? 0} components</div></div>
    {selectedResultEntity && <div className="flex shrink-0 items-center gap-2 border-b border-[#ead8ca] bg-[#fff8f3] px-4 py-2.5"><span className="h-2 w-2 shrink-0 rounded-full bg-[#c26a2e]" /><div className="min-w-0 truncate text-[10px] text-[#6f4428]"><span className="font-semibold">Result location</span>{selectedResultLabel ? <span> · {selectedResultLabel}</span> : null}{isNodeResult ? <span> · highlighted net</span> : null}{isBranchResult ? <span> · highlighted branch</span> : null}</div></div>}
    <div className="min-h-0 flex-1 overflow-auto bg-[#fbfbfa] p-3">{schematic?.error ? <div className="flex h-full min-h-[360px] items-center justify-center px-8 text-center"><div><div className="text-sm font-semibold text-[#17253a]">Schematic unavailable</div><div className="mt-1 text-xs leading-5 text-[#69717b]">{schematic.error}</div></div></div> : <svg viewBox={`${schematic.bounds.minX} ${schematic.bounds.minY} ${schematic.bounds.width} ${schematic.bounds.height}`} className="h-full min-h-[360px] w-full min-w-0" role="img" aria-label="Circuit schematic preview" preserveAspectRatio="xMidYMid meet">
      <defs><pattern id="schematic-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#e1e4e7" /></pattern></defs>
      <rect x={schematic.bounds.minX} y={schematic.bounds.minY} width={schematic.bounds.width} height={schematic.bounds.height} fill="url(#schematic-grid)" pointerEvents="none" />
      {selectedNodeNet !== null && <><path d={selectedNodeEndpoints.map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ")} fill="none" stroke={SELECTED} strokeWidth="8" opacity="0.2" pointerEvents="none" />{selectedNodeEndpoints.map(({ x, y, instanceId, portId }) => <circle key={`${instanceId}-${portId}`} cx={x} cy={y} r="7" fill="white" stroke={SELECTED} strokeWidth="3" pointerEvents="none" />)}</>}
      {(schematic?.wires ?? []).flatMap((wire, index) => (wire.paths ?? []).map((path, pathIndex) => <path key={`wire-${index}-${pathIndex}`} d={path} fill="none" stroke={STROKE} strokeWidth="3" strokeLinecap="round" pointerEvents="none" />))}
      {(schematic?.junctions ?? []).map((junction, index) => <circle key={`junction-${index}`} cx={junction.x} cy={junction.y} r="5" fill={STROKE} pointerEvents="none" />)}
      {schematic.instances.map((instance) => <SchematicSymbol key={instance.id} instance={instance} position={schematic.positions.get(instance.id) ?? { x: 0, y: 0 }} orientation={schematic.orientations.get(instance.id)} selected={instance.id === selectedNodeId} resultHighlighted={resultHighlight.instanceIds.has(instance.id)} onSelect={onSelectComponent} />)}
      {groundCenters.length > 0 && <g transform={`translate(${groundSymbolX} ${GROUND_BUS_Y})`} pointerEvents="none"><line x1={groundMinX - groundSymbolX} y1="0" x2={groundMaxX - groundSymbolX} y2="0" stroke={STROKE} strokeWidth="3" /><line x1="0" y1="0" x2="0" y2="18" stroke={STROKE} strokeWidth="3" /><line x1="-18" y1="18" x2="18" y2="18" stroke={STROKE} strokeWidth="3" /><line x1="-11" y1="24" x2="11" y2="24" stroke={STROKE} strokeWidth="3" /><line x1="-5" y1="30" x2="5" y2="30" stroke={STROKE} strokeWidth="3" /></g>}
    </svg>}</div>
  </div>;
}
