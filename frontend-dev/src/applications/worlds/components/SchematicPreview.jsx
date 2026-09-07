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

function buildSymbolDefinition(node) {
  const type = getNodeType(node);
  if (type.includes("ground")) return "ground";
  if (type.includes("voltage")) return "voltage-source";
  if (type.includes("resistor")) return "resistor";
  return "generic";
}

function getSymbolSize(node) {
  switch (buildSymbolDefinition(node)) {
    case "ground":
      return { width: 90, height: 110 };
    case "voltage-source":
      return { width: 160, height: 120 };
    default:
      return SYMBOL_SIZE;
  }
}

function getComponentValue(node) {
  const type = buildSymbolDefinition(node);
  const properties = node.data?.properties ?? {};

  if (type === "resistor") {
    return `${properties.resistance ?? "—"} Ω`;
  }

  if (type === "voltage-source") {
    return `${properties.voltage ?? "—"} V DC`;
  }

  if (type === "ground") {
    return "GND";
  }

  return "";
}

function getComponentOrientation(node) {
  const definition = getDefinition(node);
  const ports = node?.data?.ports ?? definition?.ports ?? [];
  const horizontal = ports.some(
    (port) => port.position === "left" || port.position === "right"
  );
  return horizontal ? "horizontal" : "vertical";
}

function normalizeSize(width, height) {
  return {
    width: Math.max(width, 1),
    height: Math.max(height, 1),
  };
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

function getWirePath(start, end) {
  if (Math.abs(start.y - end.y) < 2 || Math.abs(start.x - end.x) < 2) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  const midX = start.x + (end.x - start.x) / 2;
  return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
}

function SchematicSymbol({ node, position, selected, onSelect }) {
  const symbol = buildSymbolDefinition(node);
  const label = node.data?.label ?? "Component";
  const value = getComponentValue(node);
  const sourceX = position.x;
  const sourceY = position.y;

  return (
    <g
      transform={`translate(${sourceX} ${sourceY})`}
      onClick={() => onSelect?.(node.id)}
      className="cursor-pointer"
    >
      {selected && (
        <rect
          x={-75}
          y={-48}
          width={150}
          height={96}
          rx="10"
          fill="none"
          stroke="#58718f"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
      )}

      {symbol === "ground" ? (
        <>
          <line x1="0" y1="-42" x2="0" y2="-8" stroke="#26364d" strokeWidth="3" />
          <path d="M -18 -8 L 18 -8 L 0 16 Z" fill="none" stroke="#26364d" strokeWidth="3" />
          <line x1="-24" y1="21" x2="24" y2="21" stroke="#26364d" strokeWidth="3" />
          <text x="0" y="48" textAnchor="middle" fontSize="12" fontWeight="600" fill="#17253a">
            {label}
          </text>
          <text x="0" y="64" textAnchor="middle" fontSize="10" fill="#69717b">
            {value}
          </text>
        </>
      ) : symbol === "voltage-source" ? (
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
            {value}
          </text>
        </>
      ) : symbol === "resistor" ? (
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
            {value}
          </text>
        </>
      ) : (
        <>
          <line x1={-TERMINAL_OFFSET} y1="0" x2="-35" y2="0" stroke="#26364d" strokeWidth="3" />
          <rect x="-35" y="-20" width="70" height="40" rx="6" fill="white" stroke="#26364d" strokeWidth="3" />
          <line x1="35" y1="0" x2={TERMINAL_OFFSET} y2="0" stroke="#26364d" strokeWidth="3" />
          <text x="0" y="50" textAnchor="middle" fontSize="12" fontWeight="600" fill="#17253a">
            {label}
          </text>
          <text x="0" y="66" textAnchor="middle" fontSize="10" fill="#69717b">
            {value}
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

  const schematic = useMemo(() => {
    if (nodes.length === 0) {
      return {
        viewBox: "0 0 760 620",
        positions: new Map(),
        wires: [],
        junctions: [],
      };
    }

    const componentNodes = [...worldNodes, ...junctionNodes];
    const columns = new Map();
    let componentIndex = 0;

    for (const node of componentNodes) {
      if (node.type === "junction") continue;
      const column = Math.max(0, Math.round((Number(node.position?.x ?? 0) + 140) / 220));
      const row = componentIndex % 4;
      const bucket = columns.get(column) ?? [];
      bucket.push({ node, row });
      columns.set(column, bucket);
      componentIndex += 1;
    }

    const sortedColumns = [...columns.keys()].sort((a, b) => a - b);
    const positionMap = new Map();
    const horizontalGap = 220;
    const verticalGap = 180;

    sortedColumns.forEach((column, columnIndex) => {
      const items = (columns.get(column) ?? []).sort(
        (a, b) => a.row - b.row
      );
      items.forEach(({ node, row }) => {
        positionMap.set(node.id, {
          x: 150 + columnIndex * horizontalGap,
          y: 140 + row * verticalGap,
        });
      });
    });

    junctionNodes.forEach((node) => {
      positionMap.set(node.id, {
        x: 150 + sortedColumns.length * horizontalGap - horizontalGap / 2,
        y: 140 + (node.position?.y ?? 0) % (4 * verticalGap),
      });
    });

    const edgePoints = edges
      .map((edge) => {
        const source = positionMap.get(edge.source);
        const target = positionMap.get(edge.target);
        return source && target ? [source, target] : null;
      })
      .filter(Boolean)
      .flat();

    const allPoints = [...positionMap.values(), ...edgePoints];
    const rawBounds = getBounds(allPoints);
    const contentWidth = Math.max(rawBounds.maxX - rawBounds.minX, 300);
    const contentHeight = Math.max(rawBounds.maxY - rawBounds.minY, 240);
    const viewMinX = rawBounds.minX - VIEW_PADDING;
    const viewMinY = rawBounds.minY - VIEW_PADDING;
    const viewWidth = contentWidth + VIEW_PADDING * 2;
    const viewHeight = contentHeight + VIEW_PADDING * 2;

    const wireData = edges
      .map((edge) => {
        const sourceNode = nodes.find((node) => node.id === edge.source);
        const targetNode = nodes.find((node) => node.id === edge.target);
        const sourceCenter = positionMap.get(edge.source);
        const targetCenter = positionMap.get(edge.target);
        if (!sourceNode || !targetNode || !sourceCenter || !targetCenter) return null;

        const sourcePort = getPortPosition(sourceNode, edge.sourceHandle);
        const targetPort = getPortPosition(targetNode, edge.targetHandle);
        if (!sourcePort || !targetPort) return null;

        const sourceDelta = {
          x: sourcePort.x - getNodeCenter(sourceNode).x,
          y: sourcePort.y - getNodeCenter(sourceNode).y,
        };
        const targetDelta = {
          x: targetPort.x - getNodeCenter(targetNode).x,
          y: targetPort.y - getNodeCenter(targetNode).y,
        };

        return {
          id: edge.id,
          path: getWirePath(
            { x: sourceCenter.x + sourceDelta.x, y: sourceCenter.y + sourceDelta.y },
            { x: targetCenter.x + targetDelta.x, y: targetCenter.y + targetDelta.y }
          ),
        };
      })
      .filter(Boolean);

    return {
      viewBox: `${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}`,
      positions: positionMap,
      wires: wireData,
    };
  }, [edges, junctionNodes, nodes, worldNodes]);

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
          viewBox={schematic.viewBox}
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
          <rect x={schematic.viewBox.split(" ")[0]} y={schematic.viewBox.split(" ")[1]} width={schematic.viewBox.split(" ")[2]} height={schematic.viewBox.split(" ")[3]} fill="url(#schematic-grid)" />

          <g stroke="#26364d" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {schematic.wires.map((wire) => (
              <path key={wire.id} d={wire.path} />
            ))}
          </g>

          {junctionNodes.map((node) => {
            const point = schematic.positions.get(node.id);
            if (!point) return null;
            return <circle key={node.id} cx={point.x} cy={point.y} r="5" fill="#26364d" />;
          })}

          {worldNodes.map((node) => (
            <SchematicSymbol
              key={node.id}
              node={node}
              position={schematic.positions.get(node.id) ?? getNodeCenter(node)}
              selected={node.id === selectedNodeId}
              onSelect={onSelectComponent}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
