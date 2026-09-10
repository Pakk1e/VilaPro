import { useMemo } from "react";

function formatSignal(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return String(value);
  return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 8 }).format(value);
}

export default function LiveSimulationView({ snapshot }) {
  const signals = useMemo(() => Object.entries(snapshot?.signals ?? {}), [snapshot]);

  return (
    <section aria-label="Live simulation state" className="rounded-xl border border-[#d9dde2] bg-white">
      <div className="border-b border-[#e4e7eb] px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Live state</div>
        <div className="mt-1 text-xs text-[#8a929c]">Current sampled values from the live simulation runtime.</div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {signals.length === 0 && <div className="text-xs text-[#69717b]">Waiting for the first simulation update.</div>}
        {signals.map(([name, value]) => (
          <div key={name} className="rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-3 py-3">
            <div className="truncate text-[10px] font-medium text-[#69717b]" title={name}>{name}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-[#17253a]">{formatSignal(value)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
