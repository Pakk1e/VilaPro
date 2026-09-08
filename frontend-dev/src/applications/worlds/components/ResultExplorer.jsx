import { useEffect, useMemo, useState } from "react";
import { createResultPlot } from "../model/resultPlot.js";
import { RESULT_MEASUREMENTS } from "../model/sweepResults.js";
import { getCircuitSummaryRows, getEntityMeasurementSeries, getMeasurementLabel, getResultSeries } from "../model/resultExplorer.js";
import ResultChart from "./ResultChart";

const labels = { voltage: "Voltage", current: "Current", power: "Power" };
const units = { voltage: "V", current: "A", power: "W" };

function formatValue(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (unit === "A") return Math.abs(number) >= 1 ? `${number.toFixed(2)} A` : `${(number * 1000).toFixed(1)} mA`;
  if (unit === "W") return Math.abs(number) >= 1 ? `${number.toFixed(2)} W` : `${(number * 1000).toFixed(1)} mW`;
  return `${number.toFixed(2)} V`;
}

function dispatchSelection(series) {
  if (!series) return;
  window.dispatchEvent(new CustomEvent("worlds:select-result", { detail: { entityType: series.entityType, entityId: series.entityId } }));
}

export default function ResultExplorer({ result }) {
  const series = useMemo(() => getResultSeries(result), [result]);
  const rows = useMemo(() => getCircuitSummaryRows(series), [series]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [measurement, setMeasurement] = useState(RESULT_MEASUREMENTS.VOLTAGE);
  const selectedRow = rows.find((row) => row.key === selectedKey) ?? rows[0] ?? null;
  const availableMeasurements = selectedRow
    ? [RESULT_MEASUREMENTS.VOLTAGE, RESULT_MEASUREMENTS.CURRENT, RESULT_MEASUREMENTS.POWER].filter((item) => Boolean(selectedRow.values[item]))
    : [];
  const effectiveMeasurement = availableMeasurements.includes(measurement) ? measurement : availableMeasurements[0] ?? null;
  const selectedSeries = selectedRow && effectiveMeasurement ? getEntityMeasurementSeries(series, selectedRow.entityType, selectedRow.entityId, effectiveMeasurement) : null;
  const isSweep = result?.analysis === "dc_sweep";

  useEffect(() => {
    if (!selectedRow && rows[0]) setSelectedKey(rows[0].key);
  }, [rows, selectedRow]);

  useEffect(() => {
    if (selectedSeries) dispatchSelection(selectedSeries);
  }, [selectedSeries]);

  useEffect(() => {
    const handleCircuitSelection = (event) => {
      const entity = event.detail;
      if (!entity) return;
      const row = rows.find((item) => item.entityType === entity.entityType && item.entityId === entity.entityId);
      if (row) setSelectedKey(row.key);
    };
    window.addEventListener("worlds:select-result", handleCircuitSelection);
    return () => window.removeEventListener("worlds:select-result", handleCircuitSelection);
  }, [rows]);

  if (!result) return null;

  const plot = isSweep && selectedSeries ? createResultPlot({
    xLabel: result?.result?.analysis_information?.sweep?.source ?? "Sweep",
    xUnit: result?.result?.analysis_information?.sweep?.parameter === "I" ? "A" : "V",
    xValues: result?.result?.datasets?.find((dataset) => dataset.name === "sweep")?.values ?? [],
    series: [selectedSeries],
  }) : null;

  return (
    <section role="region" aria-label="Simulation results" className="overflow-hidden rounded-xl border border-[#d9dde2] bg-white">
      <div className="border-b border-[#e4e7eb] px-4 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Circuit Summary</div>
        <div className="mt-1 text-xs text-[#8a929c]">Select a component or node to inspect its result.</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" aria-label="Circuit result summary">
          <thead className="bg-[#fafbfc]">
            <tr className="border-b border-[#e4e7eb]">
              <th className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Element</th>
              <th className="px-3 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">V</th>
              <th className="px-3 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">I</th>
              <th className="px-3 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">P</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="4" className="px-4 py-6 text-xs text-[#69717b]">No circuit results are available.</td></tr>
            ) : rows.map((row) => {
              const active = row.key === selectedRow?.key;
              return (
                <tr key={row.key} className={`border-b border-[#eef0f2] ${active ? "bg-[#f3f6f8]" : "hover:bg-[#fafbfc]"}`}>
                  <td className="p-0">
                    <button type="button" onClick={() => setSelectedKey(row.key)} aria-pressed={active} className="flex w-full items-center px-4 py-2.5 text-left text-xs font-medium text-[#17253a]">
                      <span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${row.entityType === "node" ? "bg-[#8a929c]" : "bg-[#58718f]"}`} />
                      {row.label}
                    </button>
                  </td>
                  {[RESULT_MEASUREMENTS.VOLTAGE, RESULT_MEASUREMENTS.CURRENT, RESULT_MEASUREMENTS.POWER].map((type) => {
                    const item = row.values[type];
                    return <td key={type} className="px-3 py-2.5 font-mono text-[11px] text-[#35445a]">{item ? (isSweep ? "—" : formatValue(item.values?.[0]?.value, item.unit)) : "—"}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedRow && (
        <div className="border-t border-[#e4e7eb]">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#fafbfc] px-4 py-3">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#69717b]">Selected</div>
              <div className="mt-0.5 text-xs font-medium text-[#17253a]">{selectedRow.label}</div>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-[#d9dde2] bg-white p-0.5" role="group" aria-label="Y axis quantity">
              {[RESULT_MEASUREMENTS.VOLTAGE, RESULT_MEASUREMENTS.CURRENT, RESULT_MEASUREMENTS.POWER].map((item) => {
                const enabled = availableMeasurements.includes(item);
                return <button key={item} type="button" disabled={!enabled} aria-pressed={effectiveMeasurement === item} onClick={() => setMeasurement(item)} className={`rounded px-3 py-1.5 text-[10px] font-medium ${effectiveMeasurement === item ? "bg-[#edf3f8] text-[#17253a]" : "text-[#69717b] hover:bg-[#f5f7f9]"} disabled:cursor-not-allowed disabled:opacity-30`}>{getMeasurementLabel(item)}</button>;
              })}
            </div>
          </div>
          <div className="px-4 py-2 text-[10px] text-[#69717b]">{labels[effectiveMeasurement] ?? "Measurement"}{selectedSeries?.unit ? ` (${units[selectedSeries.measurementType] ?? selectedSeries.unit})` : ""}</div>
          {plot && <div className="border-t border-[#e4e7eb] p-3"><ResultChart plot={plot} series={selectedSeries} /></div>}
        </div>
      )}
    </section>
  );
}
