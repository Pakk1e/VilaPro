import { Handle, Position } from "@xyflow/react";

const POSITION_MAP = { left: Position.Left, right: Position.Right, top: Position.Top, bottom: Position.Bottom };

export default function WorldNode({ data, selected }) {
  const ports = data?.ports ?? [];
  return (
    <div className={["relative w-[150px] overflow-visible border bg-white", selected ? "border-[#58718f] ring-1 ring-[#dce5ef]" : "border-[#9ea8b4]"].join(" ")}>
      {ports.map((port) => <Handle key={port.id} id={port.id} type="source" position={POSITION_MAP[port.position] ?? Position.Right} isConnectable className="!h-2.5 !w-2.5 !border-0 !bg-[#26364d]" title={`${port.label ?? port.id} — ${port.kind}`} />)}
      <div className="flex min-h-[62px] items-center justify-center px-3 py-2 text-center">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#667382]">{data?.componentType ?? "Component"}</div>
          <div className="mt-1 text-xs font-semibold text-[#17253a]">{data?.label ?? "Unnamed"}</div>
        </div>
      </div>
    </div>
  );
}
