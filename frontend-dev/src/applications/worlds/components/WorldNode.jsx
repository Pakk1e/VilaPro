import { createContext, useContext } from "react";
import { Handle, Position } from "@xyflow/react";

export const WorldNodeContext = createContext({
  updateProperty: () => { },
  getDefinition: () => null,
  isEditing: () => false,
  setEditing: () => { },
});

const POSITION_MAP = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

export default function WorldNode({ id, data, selected }) {
  const ports = data?.ports ?? [];

  const {
    updateProperty,
    getDefinition,
    isEditing,
    setEditing,
  } = useContext(WorldNodeContext);

  const definition = getDefinition(data?.definitionKey);
  const editing = isEditing(id);
  const showPropertyInput = selected || editing;
  const properties = data?.properties ?? {};

  const handleDoubleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setEditing(id);
  };

  const stopInteraction = (event) => {
    event.stopPropagation();
  };

  return (
    <div
      className={[
        "relative w-[360px] overflow-visible rounded-xl border bg-white shadow-sm",
        selected
          ? "border-[#58718f] ring-2 ring-[#dce5ef]"
          : "border-[#cfd5dc]",
      ].join(" ")}
      onDoubleClick={handleDoubleClick}
    >
      {ports.map((port) => {
        const position =
          POSITION_MAP[port.position] ?? Position.Right;

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

      <div
        className="px-6 py-4"
        onPointerDown={editing ? stopInteraction : undefined}
        onMouseDown={editing ? stopInteraction : undefined}
        onClick={editing ? stopInteraction : undefined}
      >
        {definition &&
          Object.entries(definition.properties ?? {}).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(definition.properties).map(
              ([key, property]) => {
                const value =
                  properties[key] ??
                  property.defaultValue ??
                  "";

                return (
                  <div key={key}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="text-[11px] font-medium text-[#58718f]">
                        {property.label ?? key}
                      </span>
                    </div>

                    {showPropertyInput ? (
                      <input
                        type={
                          property.type === "number"
                            ? "number"
                            : "text"
                        }
                        value={value}
                        min={property.min}
                        max={property.max}
                        step={
                          property.step ??
                          (property.type === "number"
                            ? "any"
                            : undefined)
                        }
                        autoFocus={editing}
                        onPointerDown={stopInteraction}
                        onMouseDown={stopInteraction}
                        onClick={stopInteraction}
                        onDoubleClick={stopInteraction}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.currentTarget.blur();
                          }
                        }}
                        onChange={(event) => {
                          const nextValue =
                            property.type === "number"
                              ? event.target.value === ""
                                ? ""
                                : Number(event.target.value)
                              : event.target.value;

                          updateProperty(key, nextValue);
                        }}
                        className="nodrag nowheel w-full rounded-md border border-[#cfd5dc] bg-white px-2.5 py-2 font-mono text-sm text-[#17253a] outline-none transition focus:border-[#58718f] focus:ring-2 focus:ring-[#dce5ef]"
                      />
                    ) : (
                      <div className="flex items-center justify-between rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2">
                        <span className="font-mono text-sm font-semibold text-[#17253a]">
                          {value}
                        </span>

                        {property.unit && (
                          <span className="text-xs text-[#69717b]">
                            {property.unit}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        ) : (
          <div className="text-[12px] text-[#8a929c]">
            No editable properties.
          </div>
        )}
      </div>
    </div>
  );
}
