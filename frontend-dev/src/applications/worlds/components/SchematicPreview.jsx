import { useMemo } from "react";

import { worldDefinitions } from "../model/worldDefinitions";

const SYMBOL_SIZE = {
  width: 150,
  height: 92,
};

const TERMINAL_OFFSET = 84;
const GROUND_TERMINAL_OFFSET = 42;
const VIEW_PADDING = 70;

function getDefinition(node) {
  return node?.data?.definitionKey
    ? worldDefinitions[node.data.definitionKey]
    : null;
}

function getNodeType(node) {
  const definition = getDefinition(node);
  return String(node?.data?.componentType ?? definition?.type ?? "").toLowerCase();
}

function getNodeCenter(node) {
  if (node?.type === "junction") {
    return {
      x: Number(node.position?.x ?? 0) + 8,
      y: Number(node.position?.y ?? 0) + 8,
    };
  }

  if (getNodeType(node).includes("ground")) {
    return {
      x: Number(node.position?.x ?? 0) + 8,
      y: Number(node.position?.y ?? 0) + 8,
    };
  }

  return {
    x: Number(node.position?.x ?? 0) + SYMBOL_SIZE.width / 2,
    y: Number(node.position?.y ?? 0) + SYMBOL_SIZE.height / 2,
  };
}

function getPortPosition(node, portId) {
  const center = getNodeCenter(node);

  if (node?.type === "junction") return center;

  const definition = getDefinition(node);
  const port = (node?.data?.ports ?? definition?.ports ?? []).find(
    (item) => item.id === portId
  );

  if (!port) return null;

  if (getNodeType(node).includes("ground")) {
    return { x: center.x, y: center.y - GROUND_TERMINAL_OFFSET };
  }

  switch (port.position) {
    case "left":
      return { x: center.x - TERMINAL_OFFSET, y: center.y };
    case "right":
      return { x: center.x + TERMINAL_OFFSET, y: center.y };
    case "top":
      return { x: center.x, y: center.y - TERMINAL_OFFSET };
    case "bottom":
      return { x: center.x, y: center.y + TERMINAL_OFFSET };
    default:
      return { x: center.x + TERMINAL_OFFSET, y: center.y };
  }
}

function getWirePath(start, end) {
  if (Math.abs(start.y - end.y) < 2 || Math.abs(start.x - end.x) < 2) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  const midX = start.x + (end.x - start.x) / 2;
  return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
}

function getBounds(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function SchematicSymbol({ node, position, selected, onSelect }) {
  const definition = getDefinition(node);
  const type = getNodeType(node);
  const label = node.data?.label ?? "Component";
  const properties = node.data?.properties ?? {};

  const isGround = type.includes("ground");
  const isSource = type.includes("voltage");

  return (
    <g
      transform={`translate(${position.x} ${position.y})`}
      onClick={() => onSelect?.(node.id)}
      className="cursor-pointer"
    >
      {selected && (
        <rect
          x={-SYMBOL_SIZE.width / 2}
          y={-SYMBOL_SIZE.height / 2}
          width={SYMBOL_SIZE.width}
          height={SYMBOL_SIZE.height}
          rx="10"
          fill="none"
          stroke="#58718f"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
      )}

      {isGround ? (
        <>
          <line x1="0" y1="-42" x2="0" y2="-8" stroke="#26364d" strokeWidth="3" />
          <path d="M -18 -8 L 18 -8 L 0 16 Z" fill="none" stroke="#26364d" strokeWidth="3" />
          <line x1="-24" y1="21" x2="24" y2="21" stroke="#26364d" strokeWidth="3" />
          <text x="0" y="48" textAnchor="middle" fontSize="12" fontWeight="600" fill="#17253a">
            {label}
          </text>
          <text x="0" y="64" textAnchor="middle" fontSize="10" fill="#69717b">
            GND
          </text>
        </>
      ) : isSource ? (
        <>
          <line x1={-TERMINAL_OFFSET} y1="0" x2="-31" y2="0" stroke="#26364d" strokeWidth="3" />
          <circle cx="0" cy="0" r="31" fill="white" stroke="#26364d" strokeWidth="3" />
          <line x1="31" y1="0" x2={TERMINAL_OFFSET} y2="0" stroke="#26364d" strokeWidth="3" />
          <line x1="-10" y1="-12" x2="10" y2="-12" stroke="#26364d" strokeWidth="2.5" />
          <line x1="0" y1="-22" x2="0" y2="-2" stroke="#26364d" strokeWidth="2.5" />
          <line x1="-10" y1="12" x2="10" y2="12" stroke="#26364d" strokeWidth="2.5" />
          <text x="0" y="50" textAnchor="middle" fontSize="12" fontWeight="600" fill="#17253a">
            {label}
          </text>
          <text x="0" y="66" textAnchor="middle" fontSize="10" fill="#69717b">
            {properties.voltage ?? "—"} V DC
          </text>
        </>
      ) : (
        <>
          <line x1={-TERMINAL_OFFSET} y1="0" x2="-38" y2="0" stroke="#26364d" strokeWidth="3" />
          <path
            d="M -38 0 L -27 -14 L -9 14 L 9 -14 L 27 14 L 38 0"
            fill="none"
            stroke="#26364d"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <line x1="38" y1="0" x2={TERMINAL_OFFSET} y2="0" stroke="#26364d" strokeWidth="3" />
          <text x="0" y="50" textAnchor="middle" fontSize="12" fontWeight="600" fill="#17253a">
            {label}
          </text>
          <text x="0" y="66" textAnchor="middle" fontSize="10" fill="#69717b">
            {properties.resistance ?? "—"} Ω
          </text>
        </>
      )}
    </g>
  );
}

export default function SchematicPreview({ nodes, edges, selectedNodeId, onSelectComponent }) {
  const worldNodes = useMemo(
    () => nodes.filter((node) => node.type === "world"),
    [nodes]
  );
  const junctionNodes = useMemo(
    () => nodes.filter((node) => node.type === "junction"),
    [nodes]
  );

  const { viewBox, positions, wires } = useMemo(() => {
    if (nodes.length === 0) {
      return {
        viewBox: `0 0 760 620`,
        positions: new Map(),
        wires: [],
      };
    }

    const anchors = nodes.map((node) => getNodeCenter(node));
    const terminalPoints = edges.flatMap((edge) => {
      const source = nodes.find((node) => node.id === edge.source);
      const target = nodes.find((node) => node.id === edge.target);
      return [
        source && getPortPosition(source, edge.sourceHandle),
        target && getPortPosition(target, edge.targetHandle),
      ].filter(Boolean);
    });

    const bounds = getBounds([...anchors, ...terminalPoints]);
    const viewMinX = bounds.minX - VIEW_PADDING;
    const viewMinY = bounds.minY - VIEW_PADDING;
    const viewWidth = Math.max(bounds.maxX - bounds.minX + VIEW_PADDING * 2, 1);
    const viewHeight = Math.max(bounds.maxY - bounds.minY + VIEW_PADDING * 2, 1);

    const positionMap = new Map(
      nodes.map((node) => [node.id, getNodeCenter(node)])
    );

    const wireData = edges
      .map((edge) => {
        const source = nodes.find((node) => node.id === edge.source);
        const target = nodes.find((node) => node.id === edge.target);
        const sourcePoint = source && getPortPosition(source, edge.sourceHandle);
        const targetPoint = target && getPortPosition(target, edge.targetHandle);
        if (!sourcePoint || !targetPoint) return null;
        return {
          id: edge.id,
          path: getWirePath(sourcePoint, targetPoint),
        };
      })
      .filter(Boolean);

    return {
      viewBox: `${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}`,
      positions: positionMap,
      wires: wireData,
    };
  }, [edges, nodes]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-full w-[38%] min-w-0 items-center justify-center rounded-xl border border-dashed border-[#d9dde2] bg-white px-6 text-center">
        <div>
          <div className="text-sm font-semibold text-[#17253a]">No circuit to preview</div>
          <div className="mt-1 text-xs leading-5 text-[#69717b]">Build the circuit in Circuit Design and return here to see its schematic.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-[38%] min-w-0 flex-col overflow-hidden border-r border-[#d9dde2] bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-[#e4e7eb] px-4 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#58718f]">Circuit schematic</div>
          <div className="mt-0.5 text-[10px] text-[#69717b]">Read-only electrical view</div>
        </div>
        <div className="text-[10px] text-[#8a929c]">{worldNodes.length} components</div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-[#fbfbfa] p-3">
        <svg
          viewBox={viewBox}
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
          <rect x="0" y="0" width="100%" height="100%" fill="url(#schematic-grid)" />

          <g stroke="#26364d" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {wires.map((wire) => (
              <path key={wire.id} d={wire.path} />
            ))}
          </g>

          {junctionNodes.map((node) => {
            const point = positions.get(node.id);
            if (!point) return null;
            return <circle key={node.id} cx={point.x} cy={point.y} r="5" fill="#26364d" />;
          })}

          {worldNodes.map((node) => (
            <SchematicSymbol
              key={node.id}
              node={node}
              position={positions.get(node.id) ?? getNodeCenter(node)}
              selected={node.id === selectedNodeId}
              onSelect={onSelectComponent}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
