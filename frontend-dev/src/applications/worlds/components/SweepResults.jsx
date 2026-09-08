import { useMemo, useState } from "react";

import { getCircuitComponent } from "../model/resultContext";
import { getSweepInformation, getSweepResponseSeries, getSweepValues, getSweepPointStatuses } from "../model/sweepResults";
import SweepChart from "./SweepChart";

function formatNumber(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function formatValue(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (unit === "A") return Math.abs(number) >= 1 ? `${number.toFixed(2)} A` : `${(number * 1000).toFixed(1)} mA`;
  if (unit === "W") return Math.abs(number) >= 1 ? `${number.toFixed(2)} W` : `${(number * 1000).toFixed(1)} mW`;
  return `${number.toFixed(2)} ${unit}`;
}

export default function SweepResults({ result }) {
  const information = getSweepInformation(result);
  const sweepValues = getSweepValues(result);
  const statuses = getSweepPointStatuses(result);
  const series = useMemo(() => getSweepResponseSeries(result), [result]);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState(null);

  const selectedSeries = series.find((item) => item.key === selectedSeriesKey) ?? series[0] ?? null;

  if (!information) return null;

  const chartRows = selectedSeries
    ? sweepValues.map((sweepValue, index) => ({
        sweepValue,
        value: selectedSeries.values[index]?.value,
        failed: statuses[index]?.status === "failed" || selectedSeries.values[index]?.failed,
        error: statuses[index]?.error ?? selectedSeries.values[index]?.error ?? null,
      }))
    : [];

  const failedCount = statuses.filter((item) => item.status === "failed").length;
  const sourceComponent = getCircuitComponent(result, information.source);
  const sourceName = sourceComponent?.name ?? information.source;
  const parameterUnit = information.parameter === "I" ? "A" : "V";
  const selectedEntityDescription = selectedSeries?.label ?? "No result series selected";

  return (
    <section aria-label="DC sweep results" className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-[#d9dde2] bg-white">
        <div className="border-b border-[#e4e7eb] px-4 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">DC Sweep Results</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-[#69717b]">
            <span className="font-medium text-[#17253a]">{sourceName}</span>
            <span>{formatNumber(information.start)} {parameterUnit} → {formatNumber(information.stop)} {parameterUnit}</span>
            <span>Step {formatNumber(information.step)} {parameterUnit}</span>
            <span>{sweepValues.length} points</span>
            {failedCount > 0 && <span className="font-medium text-red-700">{failedCount} failed</span>}
          </div>
        </div>

        {sweepValues.length === 0 ? (
          <div className="px-4 py-5 text-xs text-[#69717b]">No sweep result points were returned.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#e4e7eb] bg-[#fafbfc]">
                  <th className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Sweep ({parameterUnit})</th>
                  <th className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Response</th>
                  <th className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Status</th>
                </tr>
              </thead>
              <tbody>
                {sweepValues.map((sweepValue, index) => {
                  const point = selectedSeries?.values[index];
                  const failed = statuses[index]?.status === "failed" || point?.failed;
                  return (
                    <tr key={`${sweepValue}-${index}`} className="border-b border-[#e4e7eb] last:border-b-0">
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-[#17253a]">{formatNumber(sweepValue)} {parameterUnit}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#26364d]">{failed ? "—" : formatValue(point?.value, selectedSeries?.unit ?? "")}</td>
                      <td className={`px-4 py-2.5 text-[10px] font-medium ${failed ? "text-red-700" : "text-[#69717b]"}`}>
                        {failed ? (statuses[index]?.error ?? point?.error ?? "Failed") : "Completed"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#d9dde2] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e7eb] px-4 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Result Series</div>
            <div className="mt-1 text-xs text-[#8a929c]">Select a circuit response. The sweep source remains the X-axis.</div>
          </div>
          {series.length > 0 && (
            <select
              aria-label="Sweep result series"
              value={selectedSeries?.key ?? ""}
              onChange={(event) => setSelectedSeriesKey(event.target.value)}
              className="max-w-[320px] rounded-md border border-[#d9dde2] bg-white px-2.5 py-2 text-xs text-[#26364d] outline-none focus:border-[#58718f]"
            >
              {series.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          )}
        </div>
        <div className="border-b border-[#e4e7eb] bg-[#fafbfc] px-4 py-2.5 text-xs text-[#26364d]">
          <span className="font-medium">Selected response:</span> {selectedEntityDescription}
        </div>
        <div className="p-3">
          {selectedSeries ? (
            <SweepChart
              rows={chartRows}
              xLabel={`Sweep (${parameterUnit})`}
              yLabel={`${selectedSeries.label}${selectedSeries.unit ? ` [${selectedSeries.unit}]` : ""}`}
            />
          ) : (
            <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-[#d9dde2] bg-[#fafbfc] px-4 text-center text-xs text-[#69717b]">
              No circuit response datasets are available for this sweep.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
