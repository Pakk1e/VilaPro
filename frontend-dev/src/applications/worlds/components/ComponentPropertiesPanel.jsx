export default function ComponentPropertiesPanel({
  definition,
  properties = {},
  onChange,
}) {
  const entries = Object.entries(
    definition?.properties ?? {}
  );

  if (entries.length === 0) {
    return (
      <div className="border-t border-[#e4e7eb] px-6 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">
          Properties
        </div>
        <div className="mt-2 text-xs text-[#8a929c]">
          No editable properties.
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-[#e4e7eb] px-6 py-4">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">
        Properties
      </div>

      <div className="space-y-3">
        {entries.map(([key, property]) => {
          const value = properties[key] ?? property.defaultValue ?? "";

          return (
            <label key={key} className="block">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-[#26364d]">
                  {property.label ?? key}
                </span>
                {property.unit && (
                  <span className="text-[10px] text-[#8a929c]">
                    {property.unit}
                  </span>
                )}
              </div>

              <input
                type={property.type === "number" ? "number" : "text"}
                value={value}
                min={property.min}
                max={property.max}
                step={property.step ?? (property.type === "number" ? "any" : undefined)}
                onChange={(event) => {
                  const nextValue =
                    property.type === "number"
                      ? event.target.value === ""
                        ? ""
                        : Number(event.target.value)
                      : event.target.value;

                  onChange(key, nextValue);
                }}
                className="nodrag w-full rounded-md border border-[#cfd5dc] bg-white px-2.5 py-2 font-mono text-xs text-[#17253a] outline-none transition focus:border-[#58718f] focus:ring-2 focus:ring-[#dce5ef]"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
