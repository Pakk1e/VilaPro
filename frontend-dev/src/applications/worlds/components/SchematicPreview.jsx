import { useMemo } from "react";

import { buildCircuitDescription } from "../model/worldGraphSerializer";
import { generateSchematic, getSchematicPort } from "../model/schematicGenerator";
import { getCircuitBranch, getCircuitComponent, getCircuitNode } from "../model/resultContext.js";

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
  return "generic";
}

function getValueLabel(instance) {
  if (instance.type === "Resistor") return `${instance.parameters?.R ?? "—"} Ω`;
  if (instance.type === "VoltageSource") return `${instance.parameters?.V ?? "—"} V DC`;
  return "";
}

function SchematicSymbol({ instance, position, orientation, selected, resultHighlighted, onSelect }) {
  const symbol = getSymbol(instance);
  const value = getValueLabel(instance);
  const label = instance.name ?? "Component";
  const symbolTransform = orientation === "reversed" ? "scale(-1 1)" : undefined;

  return (
    <g
      transform={`translate(${position.x} ${position.y})`}
      onClick={() => onSelect?.(instance.id)}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.(instance.id);
        }
      }}
    >
      {resultHighlighted && (
        <rect x="-86" y="-56" width="172" height="112" rx="10" fill="none" stroke={RESULT_HIGHLIGHT} strokeWidth="4" />
      )}
      {selected && !resultHighlighted && (
        <rect
          x="-82"
          y="-52"
          width="164"
          height="104"
          rx="9"
          fill="none"
          stroke={SELECTED}
          strokeWidth="2"
          strokeDasharray="5 4"
        />
      )}

      <g transform={symbolTransform}>
        {symbol === "voltage-source" ? (
          <>
            <line x1={-TERMINAL_OFFSET} y1="0" x2="-32" y2="0" stroke={STROKE} strokeWidth="3" />
            <circle cx="0" cy="0" r="32" fill="white" stroke={STROKE} strokeWidth="3" />
            <line x1="32" y1="0" x2={TERMINAL_OFFSET} y2="0" stroke={STROKE} strokeWidth="3" />
            <line x1="-10" y1="-12" x2="10" y2="-12" stroke={STROKE} strokeWidth="2.5" />
            <line x1="0" y1="-22" x2="0" y2="-2" stroke={STROKE} strokeWidth="2.5" />
            <line x1="-10" y1="12" x2="10" y2="12" stroke={STROKE} strokeWidth="2.5" />
          </>
        ) : symbol === "resistor" ? (
          <>
            <line x1={-TERMINAL_OFFSET} y1="0" x2="-40" y2="0" stroke={STROKE} strokeWidth="3" />
            <path d="M -40 0 L -28 -14 L -10 14 L 8 -14 L 26 14 L 40 0" fill="none" stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
            <line x1="40" y1="0" x2={TERMINAL_OFFSET} y2="0" stroke={STROKE} strokeWidth="3" />
          </>
        ) : (
          <>
            <line x1={-TERMINAL_OFFSET} y1="0" x2="-38" y2="0" stroke={STROKE} strokeWidth="3" />
            <rect x="-38" y="-22" width="76" height="44" rx="6" fill="white" stroke={STROKE} strokeWidth="3" />
            <line x1="38" y1="0" x2={TERMINAL_OFFSET} y2="0" stroke={STROKE} strokeWidth="3" />
          </>
        )}
      </g>

      <text x="0" y="50" textAnchor="middle" fontSize="12" fontWeight="600" fill={TEXT}>
        {label}
      </text>
      {value && (
        <text x="0" y="66" textAnchor="middle" fontSize="10" fill={MUTED}>
          {value}
        </text>
      )}
    </g>
  );
}

export default function SchematicPreview({
  nodes,
  edges,
  selectedNodeId,
  onSelectComponent,
  selectedResultEntity,
}) {
  const schematic = useMemo(() => {
    if (!nodes.length) return null;

    try {
      const description = buildCircuitDescription(nodes, edges);
      return {
        ...generateSchematic(description),
        error: null,
      };
    } catch (error) {
      return {
        instances: [],
        positions: new Map(),
        orientations: new Map(),
        wires: [],
        junctions: [],
        bounds: { minX: 0, minY: 0, width: 760, height: 430 },
        error: error instanceof Error ? error.message : "Unable to build schematic.",
      };
    }
  }, [edges, nodes]);

  const resultHighlight = useMemo(() => {
    if (!selectedResultEntity || !schematic) return { instanceIds: new Set(), nodeId: null, branch: null };

    if (selectedResultEntity.entityType === "component") {
      return { instanceIds: new Set([selectedResultEntity.entityId]), nodeId: null, branch: null };
    }

    if (selectedResultEntity.entityType === "branch") {
      const branch = getCircuitBranch({ result: { circuit_context: { branches: [] } } }, selectedResultEntity.entityId);
      return { instanceIds: new Set(), nodeId: null, branch };
    }

    if (selectedResultEntity.entityType === "node") {
      const node = getCircuitNode(selectedResultEntity.result, selectedResultEntity.entityId);
      const instanceIds = new Set((node?.connections ?? []).map((connection) => connection.instance_id));
      return { instanceIds, nodeId: selectedResultEntity.entityId, branch: null };
    }

    return { instanceIds: new Set(), nodeId: null, branch: null };
  }, [schematic, selectedResultEntity]);

  const resultBranchInstanceId = selectedResultEntity?.entityType === "branch"
    ? String(selectedResultEntity.entityId ?? "").split("->")[0]
    : null;

  if (!nodes.length) {
    return (
      <div className="flex h-full w-[38%] min-w-0 items-center justify-center rounded-xl border border-dashed border-[#d9dde2] bg-white px-6 text-center">
        <div>
          <div className="text-sm font-semibold text-[#17253a]">No circuit to preview</div>
          <div className="mt-1 text-xs leading-5 text-[#69717b]">
            Build the circuit in Circuit Design and return here to see its schematic.
          </div>
        </div>
      </div>
    );
  }

  const groundCenters = (schematic?.instances ?? [])
    .filter((instance) => Object.values(instance.ports ?? {}).includes("ground"))
    .map((instance) => schematic.positions.get(instance.id)?.x)
    .filter((x) => Number.isFinite(x));
  const groundMinX = Math.min(...groundCenters.map((x) => x - TERMINAL_OFFSET), -20);
  const groundMaxX = Math.max(...groundCenters.map((x) => x + TERMINAL_OFFSET), 220);
  const groundSymbolX = (groundMinX + groundMaxX) / 2;

  const selectedNodeNet = resultHighlight.nodeId && schematic.netColumns.has(resultHighlight.nodeId)
    ? schematic.netColumns.get(resultHighlight.nodeId)
    : null;
  const selectedNodeEndpoints = resultHighlight.nodeId
    ? (schematic.netGraph.get(resultHighlight.nodeId) ?? []).map(({ instance, portId }) => {
        const point = getSchematicPort(instance, portId, schematic);
        return point ? { ...point, instanceId: instance.id, portId } : null;
      }).filter(Boolean)
    : [];

  return (
    <div className="flex h-full w-[38%] min-w-0 flex-col overflow-hidden border-r border-[#d9dde2] bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-[#e4e7eb] px-4 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#58718f]">
            Circuit schematic
          </div>
          <div className="mt-0.5 text-[10px] text-[#69717b]">Read-only electrical view</div>
        </div>
        <div className="text-[10px] text-[#8a929c]">
          {schematic?.instances.length ?? 0} components
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-[#fbfbfa] p-3">
        {schematic?.error ? (
          <div className="flex h-full min-h-[360px] items-center justify-center px-8 text-center">
            <div>
              <div className="text-sm font-semibold text-[#17253a]">Schematic unavailable</div>
              <div className="mt-1 text-xs leading-5 text-[#69717b]">{schematic.error}</div>
            </div>
          </div>
        ) : (
          <svg
            viewBox={`${schematic.bounds.minX} ${schematic.bounds.minY} ${schematic.bounds.width} ${schematic.bounds.height}`}
            className="h-full min-h-[360px] w-full min-w-0"
            role="img"
            aria-label="Circuit schematic preview"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <pattern id="schematic-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#e1e4e7" />
              </pattern>
            </defs>

            <rect x={schematic.bounds.minX} y={schematic.bounds.minY} width={schematic.bounds.width} height={schematic.bounds.height} fill="url(#schematic-grid)" />

            {selectedNodeNet !== null && (
              <>
                <line x1={selectedNodeNet} y1={80} x2={selectedNodeNet} y2={GROUND_BUS_Y - 24} stroke={RESULT_HIGHLIGHT} strokeWidth="5" strokeDasharray="9 7" opacity="0.7" />
                <rect x={selectedNodeNet - 42} y="74" width="84" height="24" rx="6" fill="white" stroke={RESULT_HIGHLIGHT} strokeWidth="2" />
                <text x={selectedNodeNet} y="90" textAnchor="middle" fontSize="11" fontWeight="700" fill={RESULT_HIGHLIGHT}>{resultHighlight.nodeId.replace("_", " ")}</text>
              </>
            )}

            <g fill="none" stroke={STROKE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              {schematic.wires.map((wire) =>
                wire.paths.map((path) => <path key={`${wire.id}-${path}`} d={path} />)
              )}
              <line x1={groundMinX} y1={GROUND_BUS_Y} x2={groundMaxX} y2={GROUND_BUS_Y} />
            </g>

            {selectedNodeEndpoints.map((point) => (
              <circle key={`${point.instanceId}-${point.portId}`} cx={point.x} cy={point.y} r="9" fill="white" stroke={RESULT_HIGHLIGHT} strokeWidth="4" />
            ))}

            {schematic.junctions.map((junction) => (
              <circle key={junction.id} cx={junction.x} cy={junction.y} r="5" fill={STROKE} />
            ))}

            <g>
              <line x1={groundSymbolX} y1={GROUND_BUS_Y} x2={groundSymbolX} y2={GROUND_BUS_Y + 20} stroke={STROKE} strokeWidth="3" />
              <line x1={groundSymbolX - 20} y1={GROUND_BUS_Y + 20} x2={groundSymbolX + 20} y2={GROUND_BUS_Y + 20} stroke={STROKE} strokeWidth="3" />
              <line x1={groundSymbolX - 13} y1={GROUND_BUS_Y + 27} x2={groundSymbolX + 13} y2={GROUND_BUS_Y + 27} stroke={STROKE} strokeWidth="3" />
              <line x1={groundSymbolX - 6} y1={GROUND_BUS_Y + 34} x2={groundSymbolX + 6} y2={GROUND_BUS_Y + 34} stroke={STROKE} strokeWidth="3" />
              <text x={groundSymbolX} y={GROUND_BUS_Y + 52} textAnchor="middle" fontSize="11" fill={MUTED}>GND</text>
            </g>

            {schematic.instances.map((instance) => {
              const position = schematic.positions.get(instance.id);
              if (!position) return null;
              const branchHighlighted = resultBranchInstanceId === instance.id;
              const resultHighlighted = resultHighlight.instanceIds.has(instance.id) || branchHighlighted;
              return (
                <SchematicSymbol
                  key={instance.id}
                  instance={instance}
                  position={position}
                  orientation={schematic.orientations.get(instance.id) ?? "normal"}
                  selected={selectedNodeId === instance.id}
                  resultHighlighted={resultHighlighted}
                  onSelect={onSelectComponent}
                />
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
