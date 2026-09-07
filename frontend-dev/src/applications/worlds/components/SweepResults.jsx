import { useMemo, useState } from "react";

import { getSweepInformation, getSweepSourceRows } from "../model/sweepResults";
import SweepChart from "./SweepChart";

function formatNumber(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function formatCurrent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return Math.abs(number) >= 1 ? `${number.toFixed(2)} A` : `${(number * 1000).toFixed(1)} mA`;
}

function formatPower(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return Math.abs(number) >= 1 ? `${number.toFixed(2)} W` : `${(number * 1000).toFixed(1)} mW`;
}

const RESULT_SERIES = [
  { key: "current", label: "Current" },
  { key: "voltage", label: "Voltage" },
  { key: "power", label: "Power" },
];

export default function SweepResults({ result, nodes = [] }) {
  const information = getSweepInformation(result);
  const rows = getSweepSourceRows(result);
  const [series, setSeries] = useState("current");

  const chartRows = useMemo(
    () => rows.map((row) => ({ sweepValue: row.sweepValue, value: row[series] })),
    [rows, series]
  );

  if (!information) return null;

  const sourceNode = nodes.find((node) => node.id === information.source);
  const sourceName = sourceNode?.data?.label ?? information.source;
  const seriesLabel = RESULT_SERIES.find((item) => item.key === series)?.label ?? "Current";

  return (
    <section aria-label="DC sweep results" className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-[#d9dde2] bg-white">
        <div className="border-b border-[#e4e7eb] px-4 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">DC Sweep Results</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-[#69717b]">
            <span className="font-medium text-[#17253a]">{sourceName}</span>
            <span>{formatNumber(information.start)} {information.parameter} → {formatNumber(information.stop)} {information.parameter}</span>
            <span>Step {formatNumber(information.step)}</span>
            <span>{rows.length} points</span>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-5 text-xs text-[#69717b]">No sweep result points were returned.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#e4e7eb] bg-[#fafbfc]">
                  <th className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Sweep ({information.parameter})</th>
                  <th className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Voltage</th>
                  <th className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Current</th>
                  <th className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Power</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.sweepValue}-${index}`} className="border-b border-[#e4e7eb] last:border-b-0">
                    <td className="px-4 py-2.5 font-mono text-xs font-medium text-[#17253a]">{formatNumber(row.sweepValue)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[#26364d]">{row.failed ? "Failed" : `${formatNumber(row.voltage)} V`}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[#26364d]">{row.failed ? "—" : formatCurrent(row.current)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[#26364d]">{row.failed ? "—" : formatPower(row.power)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#d9dde2] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e7eb] px-4 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Result Series</div>
            <div className="mt-1 text-xs text-[#8a929c]">Plot a result from the swept source.</div>
          </div>
          <div className="flex rounded-md border border-[#d9dde2] bg-[#fafbfc] p-0.5" role="group" aria-label="Result series">
            {RESULT_SERIES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSeries(item.key)}
                aria-pressed={series === item.key}
                className={`rounded px-2.5 py-1.5 text-[10px] font-medium transition ${series === item.key ? "bg-white text-[#17253a] shadow-sm" : "text-[#69717b] hover:text-[#26364d]"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3">
          <SweepChart
            rows={chartRows}
            xLabel={`Sweep (${information.parameter})`}
            yLabel={seriesLabel}
          />
        </div>
      </div>
    </section>
  );
}
