import { Handle, Position } from "@xyflow/react";
import { worldDefinitions } from "../model/worldDefinitions";

const POSITION_MAP = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

export default function WorldNode({ data, selected }) {
  const ports = data?.ports ?? [];
  const properties = data?.properties ?? {};
  const definition = data?.definitionKey
    ? worldDefinitions[data.definitionKey]
    : null;
  const definitionProperties = definition?.properties ?? {};

  return (
    <div
      className={[
        "relative w-[280px] overflow-visible rounded-xl border bg-white shadow-sm",
        selected
          ? "border-[#58718f] ring-2 ring-[#dce5ef]"
          : "border-[#cfd5dc]",
      ].join(" ")}
    >
      {ports.map((port) => {
        const position = POSITION_MAP[port.position] ?? Position.Right;

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

      <div className="border-b border-[#e4e7eb] px-5 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#58718f]">
          {data?.componentType ?? "Component"}
        </div>

        <div className="mt-2 text-[18px] font-semibold text-[#17253a]">
          {data?.label ?? "Unnamed"}
        </div>
      </div>

      <div className="px-5 py-4">
        {Object.entries(definitionProperties).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(definitionProperties).map(([key, property]) => {
              const value = properties[key] ?? property.defaultValue ?? "";

              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2"
                >
                  <span className="min-w-0 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-[#69717b]">
                    {property.label ?? key}
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold text-[#17253a]">
                    {value}
                    {property.unit && (
                      <span className="ml-1 text-xs font-normal text-[#69717b]">
                        {property.unit}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[12px] text-[#8a929c]">No parameters.</div>
        )}
      </div>
    </div>
  );
}
