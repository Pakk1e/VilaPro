function isPropertyVisible(property, properties) {
  const condition = property?.visibleWhen;
  if (!condition) return true;
  const actualValue = properties[condition.property];
  if (Object.prototype.hasOwnProperty.call(condition, "equals")) return actualValue === condition.equals;
  if (Object.prototype.hasOwnProperty.call(condition, "notEquals")) return actualValue !== condition.notEquals;
  return true;
}

export default function ComponentPropertiesPanel({ definition, properties = {}, onChange }) {
  const entries = Object.entries(definition?.properties ?? {}).filter(([, property]) => isPropertyVisible(property, properties));
  if (entries.length === 0) return <div className="text-[9px] leading-4 text-[#8a95a2]">No editable properties.</div>;

  return <div className="space-y-3">
    {entries.map(([key, property]) => {
      const value = properties[key] ?? property.defaultValue ?? "";
      return <label key={key} className="block">
        <div className="mb-1.5 flex items-baseline justify-between gap-3"><span className="text-[10px] font-medium text-[#34465d]">{property.label ?? key}</span>{property.unit && <span className="text-[9px] text-[#8a95a2]">{property.unit}</span>}</div>
        {property.type === "select" ? <select aria-label={property.label ?? key} value={value} onChange={event => onChange(key, event.target.value)} className="nodrag h-9 w-full rounded-md border border-[#d0d8e0] bg-white px-2.5 text-[10px] text-[#1f3148] outline-none transition focus:border-[#7c91a6] focus:ring-2 focus:ring-[#e2e8ee]">{(property.options ?? []).map(option => <option key={option.value} value={option.value}>{option.label ?? option.value}</option>)}</select> : <input aria-label={property.label ?? key} type={property.type === "number" ? "number" : "text"} value={value} min={property.min} max={property.max} step={property.step ?? (property.type === "number" ? "any" : undefined)} onChange={event => { const nextValue = property.type === "number" ? event.target.value === "" ? "" : Number(event.target.value) : event.target.value; onChange(key, nextValue); }} className="nodrag h-9 w-full rounded-md border border-[#d0d8e0] bg-white px-2.5 font-mono text-[10px] text-[#1f3148] outline-none transition focus:border-[#7c91a6] focus:ring-2 focus:ring-[#e2e8ee]" />}
      </label>;
    })}
  </div>;
}
