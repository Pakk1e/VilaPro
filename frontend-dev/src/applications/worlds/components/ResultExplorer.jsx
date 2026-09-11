import { useEffect, useMemo, useState } from "react";
import { formatEngineeringValue } from "../model/engineeringFormat.js";
import { createResultPlot } from "../model/resultPlot.js";
import { RESULT_MEASUREMENTS } from "../model/sweepResults.js";
import { getCircuitSummaryRows, getEntityMeasurementSeries, getMeasurementLabel, getResultSeries, getSummaryValue } from "../model/resultExplorer.js";
import ResultChart from "./ResultChart";

const measurements = [RESULT_MEASUREMENTS.VOLTAGE, RESULT_MEASUREMENTS.CURRENT, RESULT_MEASUREMENTS.POWER];

function formatIdentifier(value) {
  return String(value ?? "")
    .replace(/^V_/, "")
    .replace(/^I_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatACVariable(name) {
  const raw = String(name ?? "");
  const voltageMatch = raw.match(/^Variable\(name=['"]V_(.+?)['"]\)$/);
  if (voltageMatch) return `V(${formatIdentifier(voltageMatch[1])})`;

  const currentMatch = raw.match(/^Variable\(name=['"]I_(.+?)['"]\)$/);
  if (currentMatch) return `I(${formatIdentifier(currentMatch[1])})`;

  if (raw.startsWith("BranchCurrent(")) {
    const variables = [...raw.matchAll(/Variable\(name=['"]([^'"]+)['"]\)/g)].map((match) => match[1]);
    if (variables.length >= 2) return `I(${formatIdentifier(variables[0])} → ${formatIdentifier(variables[1])})`;
    if (variables.length === 1) return `I(${formatIdentifier(variables[0])})`;
    return "Branch current";
  }

  return raw;
}

function getACUnit(name) {
  const raw = String(name ?? "");
  if (/^Variable\(name=['"]V_/.test(raw)) return "V";
  if (/^Variable\(name=['"]I_/.test(raw) || raw.startsWith("BranchCurrent(")) return "A";
  return "";
}

function formatACValue(value, unit) {
  return formatEngineeringValue(value, unit);
}

function SummaryTable({ title, rows, selectedRow, onSelect, isSweep }) {
  return <div className="border-b border-[#e4e7eb] last:border-b-0">
    <div className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#69717b]">{title}</div>
    <table className="w-full border-collapse text-left" aria-label={`${title} result summary`}>
      <thead className="bg-[#fafbfc]"><tr className="border-y border-[#eef0f2]"><th className="px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Element</th>{measurements.map((type) => <th key={type} className="px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">{getMeasurementLabel(type)}</th>)}</tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan="4" className="px-4 py-4 text-xs text-[#69717b]">No {title.toLowerCase()} results are available.</td></tr> : rows.map((row) => {
        const active = row.key === selectedRow?.key;
        return <tr key={row.key} className={`border-b border-[#eef0f2] last:border-b-0 ${active ? "bg-[#f3f6f8]" : "hover:bg-[#fafbfc]"}`}><td className="p-0"><button type="button" onClick={() => onSelect(row.key)} aria-pressed={active} className="flex w-full items-center px-4 py-2.5 text-left text-xs font-medium text-[#17253a]"><span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${row.entityType === "node" ? "bg-[#8a929c]" : "bg-[#58718f]"}`} />{row.label}</button></td>{measurements.map((type) => { const item = row.values[type]; return <td key={type} className="px-3 py-2.5 font-mono text-[11px] text-[#35445a]">{item ? formatEngineeringValue(getSummaryValue(item), item.unit) : "—"}</td>; })}</tr>;
      })}</tbody>
    </table>
    {isSweep && rows.length > 0 && <div className="px-4 py-2 text-[9px] text-[#8a929c]">Values shown at the last valid sweep point.</div>}
  </div>;
}

function dispatchResultSelection(row) {
  if (!row || row.entityType === "series") return;
  window.dispatchEvent(new CustomEvent("worlds:select-result", { detail: { entityType: row.entityType, entityId: row.entityId } }));
}

function ACResultView({ result }) {
  const datasets = Object.fromEntries((Array.isArray(result?.result?.datasets) ? result.result.datasets : []).map((dataset) => [dataset.name, dataset.values]));
  const frequency = Array.isArray(datasets.frequency) ? datasets.frequency[0] : null;
  const phasors = Array.isArray(datasets.phasors) ? datasets.phasors : [];
  return <section role="region" aria-label="AC phasor results" className="overflow-hidden rounded-xl border border-[#d9dde2] bg-white">
    <div className="border-b border-[#e4e7eb] px-4 py-4"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">AC Phasors</div><div className="mt-1 text-xs text-[#8a929c]">Steady-state complex response at the selected frequency.</div></div>
    <div className="grid gap-3 p-4 sm:grid-cols-3">
      <div className="rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-3 py-3"><div className="text-[10px] text-[#69717b]">Frequency</div><div className="mt-1 text-lg font-semibold tabular-nums text-[#17253a]">{frequency ?? "—"}<span className="ml-1 text-[10px] font-medium text-[#8a929c]">Hz</span></div></div>
      <div className="rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-3 py-3"><div className="text-[10px] text-[#69717b]">Excitation magnitude</div><div className="mt-1 text-lg font-semibold tabular-nums text-[#17253a]">{result?.result?.analysis_information?.excitation?.magnitude ?? "—"}</div></div>
      <div className="rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-3 py-3"><div className="text-[10px] text-[#69717b]">Excitation phase</div><div className="mt-1 text-lg font-semibold tabular-nums text-[#17253a]">{result?.result?.analysis_information?.excitation?.phase_deg ?? "—"}<span className="ml-1 text-[10px] font-medium text-[#8a929c]">°</span></div></div>
    </div>
    <div className="border-t border-[#e4e7eb]">
      <div className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#69717b]">Phasor values</div>
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] border-collapse text-left"><thead className="bg-[#fafbfc]"><tr className="border-y border-[#eef0f2]"><th className="w-[34%] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Signal</th><th className="px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Magnitude</th><th className="px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Phase</th><th className="px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Real</th><th className="px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#69717b]">Imaginary</th></tr></thead>
        <tbody>{phasors.length === 0 ? <tr><td colSpan="5" className="px-4 py-4 text-xs text-[#69717b]">No AC phasor values are available.</td></tr> : phasors.map((item) => {
          const label = formatACVariable(item.name);
          const unit = getACUnit(item.name);
          return <tr key={item.name} className="border-b border-[#eef0f2] last:border-b-0"><td className="px-4 py-2.5 text-xs font-medium text-[#17253a]" title={item.name}>{label}</td><td className="px-3 py-2.5 font-mono text-[11px] text-[#35445a]">{formatACValue(item.magnitude, unit)}</td><td className="px-3 py-2.5 font-mono text-[11px] text-[#35445a]">{formatACValue(item.phase_deg, "")}°</td><td className="px-3 py-2.5 font-mono text-[11px] text-[#35445a]">{formatACValue(item.real, unit)}</td><td className="px-3 py-2.5 font-mono text-[11px] text-[#35445a]">{formatACValue(item.imag, unit)}</td></tr>;
        })}</tbody>
      </table></div>
    </div>
  </section>;
}

export default function ResultExplorer({ result }) {
  const series = useMemo(() => getResultSeries(result), [result]);
  const rows = useMemo(() => getCircuitSummaryRows(series), [series]);
  const nodeRows = rows.filter((row) => row.entityType === "node");
  const componentRows = rows.filter((row) => row.entityType === "component");
  const branchRows = rows.filter((row) => row.entityType === "branch");
  const isSweep = result?.analysis === "dc_sweep";
  const isTransient = result?.analysis === "transient";
  const isAC = result?.analysis === "ac";
  const [selectedKey, setSelectedKey] = useState(null);
  const [measurement, setMeasurement] = useState(null);
  const selectedRow = rows.find((row) => row.key === selectedKey) ?? componentRows[0] ?? branchRows[0] ?? nodeRows.find((row) => row.entityId !== "ground") ?? nodeRows[0] ?? null;
  const availableMeasurements = selectedRow ? measurements.filter((item) => Boolean(selectedRow.values[item])) : [];
  const defaultMeasurement = isSweep && availableMeasurements.includes(RESULT_MEASUREMENTS.CURRENT)
    ? RESULT_MEASUREMENTS.CURRENT
    : RESULT_MEASUREMENTS.VOLTAGE;
  const effectiveMeasurement = availableMeasurements.includes(measurement) ? measurement : availableMeasurements.includes(defaultMeasurement) ? defaultMeasurement : availableMeasurements[0] ?? null;
  const selectedSeries = selectedRow && effectiveMeasurement ? getEntityMeasurementSeries(series, selectedRow.entityType, selectedRow.entityId, effectiveMeasurement) : null;

  useEffect(() => { dispatchResultSelection(selectedRow); }, [selectedRow]);
  useEffect(() => {
    const handleCircuitSelection = (event) => { const entity = event.detail; if (!entity) return; const row = rows.find((item) => item.entityType === entity.entityType && item.entityId === entity.entityId); if (row) setSelectedKey(row.key); };
    window.addEventListener("worlds:select-result", handleCircuitSelection);
    return () => window.removeEventListener("worlds:select-result", handleCircuitSelection);
  }, [rows]);

  if (!result) return null;
  if (isAC) return <ACResultView result={result} />;

  let plot = null;
  if (selectedSeries) {
    const xValues = Array.isArray(selectedSeries.xValues) ? selectedSeries.xValues : [];
    if (xValues.length > 0) {
      plot = createResultPlot({
        xKey: selectedSeries.xKey,
        xLabel: selectedSeries.xLabel || (isTransient ? "Time" : isSweep ? "Sweep" : "X"),
        xUnit: selectedSeries.xUnit || (isTransient ? "s" : ""),
        xValues,
        series: [selectedSeries],
      });
    }
  }

  const selectedResultLabel = selectedSeries?.label ?? selectedRow?.label ?? "—";

  return <section role="region" aria-label="Simulation results" className="overflow-hidden rounded-xl border border-[#d9dde2] bg-white">
    <div className="border-b border-[#e4e7eb] px-4 py-4"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Circuit Summary</div><div className="mt-1 text-xs text-[#8a929c]">Select a component, branch or node to inspect its result.</div></div>
    <SummaryTable title="Nodes" rows={nodeRows} selectedRow={selectedRow} onSelect={setSelectedKey} isSweep={isSweep} />
    <SummaryTable title="Components" rows={componentRows} selectedRow={selectedRow} onSelect={setSelectedKey} isSweep={isSweep} />
    {branchRows.length > 0 && <SummaryTable title="Branches" rows={branchRows} selectedRow={selectedRow} onSelect={setSelectedKey} isSweep={isSweep} />}
    {selectedRow && <div className="border-t border-[#e4e7eb]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#fafbfc] px-4 py-3"><div className="min-w-0"><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#69717b]">Selected</div><div className="mt-0.5 truncate text-xs font-medium text-[#17253a]">{selectedResultLabel}</div></div><div className="flex items-center gap-2"><button type="button" onClick={() => dispatchResultSelection(selectedRow)} className="rounded-md border border-[#d9dde2] bg-white px-3 py-1.5 text-[10px] font-medium text-[#35445a] hover:bg-[#f5f7f9]">Show in circuit</button><div className="flex items-center gap-1 rounded-md border border-[#d9dde2] bg-white p-0.5" role="group" aria-label="Y axis quantity">{measurements.map((item) => { const enabled = availableMeasurements.includes(item); return <button key={item} type="button" disabled={!enabled} aria-pressed={effectiveMeasurement === item} onClick={() => setMeasurement(item)} className={`rounded px-3 py-1.5 text-[10px] font-medium ${effectiveMeasurement === item ? "bg-[#edf3f8] text-[#17253a]" : "text-[#69717b] hover:bg-[#f5f7f9]"} disabled:cursor-not-allowed disabled:opacity-30`}>{getMeasurementLabel(item)}</button>; })}</div></div></div>
      {plot && <div className="border-t border-[#e4e7eb] p-3"><ResultChart plot={plot} series={selectedSeries} /></div>}
      {isTransient && !plot && <div className="border-t border-[#e4e7eb] px-4 py-4 text-xs text-[#69717b]">No plottable transient series is available for the selected result.</div>}
    </div>}
  </section>;
}
