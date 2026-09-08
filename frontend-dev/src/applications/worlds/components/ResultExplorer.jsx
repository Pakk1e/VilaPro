import { useEffect, useMemo, useState } from "react";
import { createResultPlot } from "../model/resultPlot.js";
import { RESULT_MEASUREMENTS } from "../model/sweepResults.js";
import { getCircuitSummaryRows, getEntityMeasurementSeries, getMeasurementLabel, getResultSeries } from "../model/resultExplorer.js";
import ResultChart from "./ResultChart";

const measurements = [RESULT_MEASUREMENTS.VOLTAGE, RESULT_MEASUREMENTS.CURRENT, RESULT_MEASUREMENTS.POWER];

function formatValue(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (unit === "A") return Math.abs(number) >= 1 ? `${number.toFixed(2)} A` : `${(number * 1000).toFixed(1)} mA`;
  if (unit === "W") return Math.abs(number) >= 1 ? `${number.toFixed(2)} W` : `${(number * 1000).toFixed(1)} mW`;
  return `${number.toFixed(2)} V`;
}

function getSummaryValue(item) {
  if (!item?.values?.length) return null;
  const valid = item.values.filter((point) => !point?.failed && point?.value !== null && point?.value !== undefined);
  return valid.length ? valid[valid.length - 1].value : null;
}

function SummaryTable({ title, rows, selectedRow, onSelect, isSweep }) {
  return (
    <div className="border-b border-[#e4e7eb] last:border-b-0">
      <div className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#69717b]">{title}</div>
      <table className="w-full border-collapse text-left" aria-label={`${title} result summary`}>
        <thead className="bg-[#fafbfc]">
          <tr className="border-y border-[#eef0f2]">
            <th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Element</th>
            {measurements.map((type) => <th key={type} className="px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">{getMeasurementLabel(type)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan="4" className="px-4 py-4 text-xs text-[#69717b]">No {title.toLowerCase()} results are available.</td></tr>
          ) : rows.map((row) => {
            const active = row.key === selectedRow?.key;
            return (
              <tr key={row.key} className={`border-b border-[#eef0f2] last:border-b-0 ${active ? "bg-[#f3f6f8]" : "hover:bg-[#fafbfc]"}`}>
                <td className="p-0">
                  <button type="button" onClick={() => onSelect(row.key)} aria-pressed={active} className="flex w-full items-center px-4 py-2.5 text-left text-xs font-medium text-[#17253a]">
                    <span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${row.entityType === "node" ? "bg-[#8a929c]" : "bg-[#58718f]"}`} />
                    {row.label}
                  </button>
                </td>
                {measurements.map((type) => {
                  const item = row.values[type];
                  return <td key={type} className="px-3 py-2.5 font-mono text-[11px] text-[#35445a]">{item ? formatValue(getSummaryValue(item), item.unit) : "—"}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {isSweep && rows.length > 0 && <div className="px-4 py-2 text-[9px] text-[#8a929c]">Values shown at the last valid sweep point.</div>}
    </div>
  );
}

export default function ResultExplorer({ result }) {
  const series = useMemo(() => getResultSeries(result), [result]);
  const rows = useMemo(() => getCircuitSummaryRows(series), [series]);
  const nodeRows = rows.filter((row) => row.entityType === "node");
  const componentRows = rows.filter((row) => row.entityType === "component");
  const [selectedKey, setSelectedKey] = useState(null);
  const [measurement, setMeasurement] = useState(RESULT_MEASUREMENTS.VOLTAGE);
  const selectedRow = rows.find((row) => row.key === selectedKey) ?? rows[0] ?? null;
  const availableMeasurements = selectedRow ? measurements.filter((item) => Boolean(selectedRow.values[item])) : [];
  const effectiveMeasurement = availableMeasurements.includes(measurement) ? measurement : availableMeasurements[0] ?? null;
  const selectedSeries = selectedRow && effectiveMeasurement ? getEntityMeasurementSeries(series, selectedRow.entityType, selectedRow.entityId, effectiveMeasurement) : null;
  const isSweep = result?.analysis === "dc_sweep";

  useEffect(() => {
    if (!selectedRow && rows[0]) setSelectedKey(rows[0].key);
  }, [rows, selectedRow]);

  useEffect(() => {
    if (selectedSeries) {
      window.dispatchEvent(new CustomEvent("worlds:select-result", { detail: { entityType: selectedSeries.entityType, entityId: selectedSeries.entityId } }));
    }
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

      <SummaryTable title="Nodes" rows={nodeRows} selectedRow={selectedRow} onSelect={setSelectedKey} isSweep={isSweep} />
      <SummaryTable title="Components" rows={componentRows} selectedRow={selectedRow} onSelect={setSelectedKey} isSweep={isSweep} />

      {selectedRow && (
        <div className="border-t border-[#e4e7eb]">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#fafbfc] px-4 py-3">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#69717b]">Selected</div>
              <div className="mt-0.5 text-xs font-medium text-[#17253a]">{selectedRow.label}</div>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-[#d9dde2] bg-white p-0.5" role="group" aria-label="Y axis quantity">
              {measurements.map((item) => {
                const enabled = availableMeasurements.includes(item);
                return <button key={item} type="button" disabled={!enabled} aria-pressed={effectiveMeasurement === item} onClick={() => setMeasurement(item)} className={`rounded px-3 py-1.5 text-[10px] font-medium ${effectiveMeasurement === item ? "bg-[#edf3f8] text-[#17253a]" : "text-[#69717b] hover:bg-[#f5f7f9]"} disabled:cursor-not-allowed disabled:opacity-30`}>{getMeasurementLabel(item)}</button>;
              })}
            </div>
          </div>
          {plot && <div className="border-t border-[#e4e7eb] p-3"><ResultChart plot={plot} series={selectedSeries} /></div>}
        </div>
      )}
    </section>
  );
}
