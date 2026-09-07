import { useMemo } from "react";

import { worldDefinitions } from "../model/worldDefinitions";
import { buildCircuitDescription } from "../model/worldGraphSerializer";

const TERMINAL_OFFSET = 92;
const COLUMN_GAP = 230;
const ROW_GAP = 150;
const VIEW_PADDING = 70;
const GROUND_BUS_GAP = 120;

const STROKE = "#26364d";
const TEXT = "#17253a";
const MUTED = "#69717b";
const SELECTED = "#58718f";

function getDefinitionForInstance(instance) {
  const componentType =
    instance.type === "VoltageSource" ? "Voltage Source" : instance.type;
  return Object.values(worldDefinitions).find(
    (definition) => definition.type === componentType
  );
}

function getPortSide(instance, portId) {
  const port = getDefinitionForInstance(instance)?.ports?.find(
    (item) => item.id === portId
  );
  return port?.position === "left" ? "left" : "right";
}

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

function buildAdjacency(instances) {
  const byNet = new Map();

  for (const instance of instances) {
    for (const net of Object.values(instance.ports ?? {})) {
      const bucket = byNet.get(net) ?? [];
      bucket.push(instance.id);
      byNet.set(net, bucket);
    }
  }

  const adjacency = new Map(
    instances.map((instance) => [instance.id, new Set()])
  );

  for (const ids of byNet.values()) {
    for (const first of ids) {
      for (const second of ids) {
        if (first !== second) adjacency.get(first)?.add(second);
      }
    }
  }

  return adjacency;
}

function chooseReference(instances) {
  return (
    instances.find((instance) => instance.type === "VoltageSource") ??
    instances[0] ??
    null
  );
}

function buildPositions(instances) {
  const reference = chooseReference(instances);
  if (!reference) return new Map();

  const adjacency = buildAdjacency(instances);
  const depth = new Map([[reference.id, 0]]);
  const queue = [reference.id];

  while (queue.length) {
    const current = queue.shift();
    const currentDepth = depth.get(current) ?? 0;

    for (const next of adjacency.get(current) ?? []) {
      if (depth.has(next)) continue;
      depth.set(next, currentDepth + 1);
      queue.push(next);
    }
  }

  let fallbackDepth = Math.max(...depth.values(), 0) + 1;
  for (const instance of instances) {
    if (!depth.has(instance.id)) {
      depth.set(instance.id, fallbackDepth);
      fallbackDepth += 1;
    }
  }

  const columns = new Map();
  for (const instance of instances) {
    const columnDepth = depth.get(instance.id) ?? 0;
    const bucket = columns.get(columnDepth) ?? [];
    bucket.push(instance);
    columns.set(columnDepth, bucket);
  }

  const positions = new Map();
  [...columns.keys()]
    .sort((a, b) => a - b)
    .forEach((columnDepth, columnIndex) => {
      const column = [...columns.get(columnDepth)].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );
      const center = (column.length - 1) / 2;

      column.forEach((instance, rowIndex) => {
        positions.set(instance.id, {
          x: 170 + columnIndex * COLUMN_GAP,
          y: 220 + (rowIndex - center) * ROW_GAP,
        });
      });
    });

  return positions;
}

function getTerminalPoint(position, side) {
  return {
    x: position.x + (side === "left" ? -TERMINAL_OFFSET : TERMINAL_OFFSET),
    y: position.y,
  };
}

function makeNetWires(instances, positions) {
  const terminalsByNet = new Map();

  for (const instance of instances) {
    const position = positions.get(instance.id);
    if (!position) continue;

    for (const [portId, net] of Object.entries(instance.ports ?? {})) {
      const bucket = terminalsByNet.get(net) ?? [];
      bucket.push({
        instanceId: instance.id,
        portId,
        point: getTerminalPoint(position, getPortSide(instance, portId)),
      });
      terminalsByNet.set(net, bucket);
    }
  }

  const wires = [];
  const groundTerminals = terminalsByNet.get("ground") ?? [];

  for (const [net, terminals] of terminalsByNet.entries()) {
    if (net === "ground" || terminals.length < 2) continue;

    const sorted = [...terminals].sort((a, b) => a.point.x - b.point.x);
    const sameY = sorted.every(
      (terminal) => Math.abs(terminal.point.y - sorted[0].point.y) < 1
    );

    if (sameY) {
      wires.push({
        id: `net-${net}`,
        paths: [
          `M ${sorted[0].point.x} ${sorted[0].point.y} L ${sorted.at(-1).point.x} ${sorted.at(-1).point.y}`,
        ],
      });
      continue;
    }

    const minX = Math.min(...sorted.map((terminal) => terminal.point.x));
    const maxX = Math.max(...sorted.map((terminal) => terminal.point.x));
    let busX = (minX + maxX) / 2;

    if (Math.abs(busX - minX) < 40) busX += 50;
    if (Math.abs(busX - maxX) < 40) busX -= 50;

    const minY = Math.min(...sorted.map((terminal) => terminal.point.y));
    const maxY = Math.max(...sorted.map((terminal) => terminal.point.y));
    const paths = sorted.map((terminal) =>
      `M ${terminal.point.x} ${terminal.point.y} L ${busX} ${terminal.point.y}`
    );
    paths.push(`M ${busX} ${minY} L ${busX} ${maxY}`);

    wires.push({ id: `net-${net}`, paths });
  }

  return { wires, groundTerminals };
}

function getGroundLayout(groundTerminals, positions) {
  if (!groundTerminals.length || !positions.size) return null;

  const maxY = Math.max(...[...positions.values()].map((position) => position.y));
  const busY = maxY + GROUND_BUS_GAP;
  const minX = Math.min(...groundTerminals.map((terminal) => terminal.point.x));
  const maxX = Math.max(...groundTerminals.map((terminal) => terminal.point.x));

  return {
    busY,
    minX: minX - 20,
    maxX: maxX + 20,
    symbolX: (minX + maxX) / 2,
    branches: groundTerminals.map(
      (terminal) =>
        `M ${terminal.point.x} ${terminal.point.y} L ${terminal.point.x} ${busY}`
    ),
  };
}

function getBounds(positions, groundLayout) {
  const points = [...positions.values()];
  if (groundLayout) {
    points.push(
      { x: groundLayout.minX, y: groundLayout.busY },
      { x: groundLayout.maxX, y: groundLayout.busY },
      { x: groundLayout.symbolX, y: groundLayout.busY + 62 }
    );
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs, -TERMINAL_OFFSET) - VIEW_PADDING;
  const maxX = Math.max(...xs, TERMINAL_OFFSET) + VIEW_PADDING;
  const minY = Math.min(...ys, -80) - VIEW_PADDING;
  const maxY = Math.max(...ys, 80) + VIEW_PADDING;

  return {
    minX,
    minY,
    width: Math.max(maxX - minX, 620),
    height: Math.max(maxY - minY, 430),
  };
}

function SchematicSymbol({ instance, position, selected, onSelect }) {
  const symbol = getSymbol(instance);
  const value = getValueLabel(instance);
  const label = instance.name ?? "Component";

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
      {selected && (
        <rect
          x="-78"
          y="-50"
          width="156"
          height="100"
          rx="9"
          fill="none"
          stroke={SELECTED}
          strokeWidth="2"
          strokeDasharray="5 4"
        />
      )}

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
          <path
            d="M -40 0 L -28 -14 L -10 14 L 8 -14 L 26 14 L 40 0"
            fill="none"
            stroke={STROKE}
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <line x1="40" y1="0" x2={TERMINAL_OFFSET} y2="0" stroke={STROKE} strokeWidth="3" />
        </>
      ) : (
        <>
          <line x1={-TERMINAL_OFFSET} y1="0" x2="-38" y2="0" stroke={STROKE} strokeWidth="3" />
          <rect x="-38" y="-22" width="76" height="44" rx="6" fill="white" stroke={STROKE} strokeWidth="3" />
          <line x1="38" y1="0" x2={TERMINAL_OFFSET} y2="0" stroke={STROKE} strokeWidth="3" />
        </>
      )}

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
}) {
  const schematic = useMemo(() => {
    if (!nodes.length) return null;

    try {
      // The schematic consumes the normalized circuit description used by
      // simulation. React Flow positions are intentionally ignored.
      const description = buildCircuitDescription(nodes, edges);
      const instances = description.instances;
      const positions = buildPositions(instances);
      const { wires, groundTerminals } = makeNetWires(instances, positions);
      const groundLayout = getGroundLayout(groundTerminals, positions);
      const bounds = getBounds(positions, groundLayout);

      return { instances, positions, wires, groundLayout, bounds, error: null };
    } catch (error) {
      return {
        instances: [],
        positions: new Map(),
        wires: [],
        groundLayout: null,
        bounds: { minX: 0, minY: 0, width: 760, height: 430 },
        error: error instanceof Error ? error.message : "Unable to build schematic.",
      };
    }
  }, [edges, nodes]);

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

            <rect
              x={schematic.bounds.minX}
              y={schematic.bounds.minY}
              width={schematic.bounds.width}
              height={schematic.bounds.height}
              fill="url(#schematic-grid)"
            />

            <g
              fill="none"
              stroke={STROKE}
              strokeWidth="3"
              strokeLinecap="square"
              strokeLinejoin="miter"
            >
              {schematic.wires.map((wire) =>
                wire.paths.map((path, index) => (
                  <path key={`${wire.id}-${index}`} d={path} />
                ))
              )}

              {schematic.groundLayout?.branches.map((path, index) => (
                <path key={`ground-branch-${index}`} d={path} />
              ))}

              {schematic.groundLayout && (
                <>
                  <line
                    x1={schematic.groundLayout.minX}
                    y1={schematic.groundLayout.busY}
                    x2={schematic.groundLayout.maxX}
                    y2={schematic.groundLayout.busY}
                  />
                  <line
                    x1={schematic.groundLayout.symbolX}
                    y1={schematic.groundLayout.busY}
                    x2={schematic.groundLayout.symbolX}
                    y2={schematic.groundLayout.busY + 32}
                  />
                  <path
                    d={`M ${schematic.groundLayout.symbolX - 18} ${schematic.groundLayout.busY + 32} L ${schematic.groundLayout.symbolX + 18} ${schematic.groundLayout.busY + 32} L ${schematic.groundLayout.symbolX} ${schematic.groundLayout.busY + 57} Z`}
                  />
                  <line
                    x1={schematic.groundLayout.symbolX - 24}
                    y1={schematic.groundLayout.busY + 62}
                    x2={schematic.groundLayout.symbolX + 24}
                    y2={schematic.groundLayout.busY + 62}
                  />
                </>
              )}
            </g>

            {schematic.groundLayout && (
              <>
                <text
                  x={schematic.groundLayout.symbolX}
                  y={schematic.groundLayout.busY + 88}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill={TEXT}
                >
                  Ground
                </text>
                <text
                  x={schematic.groundLayout.symbolX}
                  y={schematic.groundLayout.busY + 104}
                  textAnchor="middle"
                  fontSize="10"
                  fill={MUTED}
                >
                  GND
                </text>
              </>
            )}

            {schematic.instances.map((instance) => {
              const position = schematic.positions.get(instance.id);
              if (!position) return null;
              return (
                <SchematicSymbol
                  key={instance.id}
                  instance={instance}
                  position={position}
                  selected={selectedNodeId === instance.id}
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
