import { Handle, Position } from "@xyflow/react";

const POSITION_MAP = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

export default function WorldNode({ data, selected }) {
  const ports = data?.ports ?? [];

  return (
    <div
      className={[
        "relative w-[360px] overflow-visible rounded-xl border bg-white shadow-sm",
        selected
          ? "border-[#58718f] ring-2 ring-[#dce5ef]"
          : "border-[#cfd5dc]",
      ].join(" ")}
    >
      {ports.map((port) => {
        const position =
          POSITION_MAP[port.position] ??
          Position.Right;

        return (
          <Handle
            key={port.id}
            id={port.id}
            type="source"
            position={position}
            isConnectable
            className="!h-3 !w-3 !border-0 !bg-[#26364d]"
            title={`${port.label ?? port.id} — ${port.kind}`}
          />
        );
      })}

      <div className="border-b border-[#e4e7eb] px-6 py-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#58718f]">
          {data?.componentType ?? "Component"}
        </div>

        <div className="mt-3 text-[20px] font-semibold text-[#17253a]">
          {data?.label ?? "Unnamed"}
        </div>
      </div>

      <div className="px-6 py-5 text-[14px] text-[#58718f]">
        {data?.description ?? ""}
      </div>
    </div>
  );
}
