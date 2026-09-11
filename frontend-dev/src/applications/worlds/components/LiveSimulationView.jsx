import { useMemo, useState } from "react";

import { formatEngineeringTick, getEngineeringScale } from "../model/engineeringFormat.js";

function formatSignal(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return String(value);
  return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 8 }).format(value);
}

function parseSignalName(name) {
  if (name === "__live.time_s") return { label: "Sample time", family: "time", plotFamily: "time", unit: "s" };
  if (name === "__live.frequency_hz") return { label: "Frequency", family: "frequency", plotFamily: "frequency", unit: "Hz" };

  const suffixes = [
    [".instantaneous", "Instantaneous"],
    [".magnitude", "Magnitude"],
    [".phase_deg", "Phase"],
  ];
  const suffix = suffixes.find(([value]) => name.endsWith(value));
  const base = suffix ? name.slice(0, -suffix[0].length) : name;
  const kind = suffix?.[1] ?? "Value";
  const plotKind = kind === "Phase" ? "phase" : "value";

  const variableMatch = base.match(/^Variable\(name='([^']+)'\)$/);
  if (variableMatch) {
    const variable = variableMatch[1];
    if (variable.startsWith("V_")) return { label: `V(${variable.slice(2)}) · ${kind}`, family: "voltage", plotFamily: `voltage-${plotKind}`, unit: kind === "Phase" ? "°" : "V" };
    if (variable.startsWith("I_")) return { label: `I(${variable.slice(2)}) · ${kind}`, family: "current", plotFamily: `current-${plotKind}`, unit: kind === "Phase" ? "°" : "A" };
    return { label: `${variable} · ${kind}`, family: "value", plotFamily: `value-${plotKind}`, unit: kind === "Phase" ? "°" : "" };
  }

  const branchMatch = base.match(/^BranchCurrent\(name='[^']+',\s*arguments=\((.*)\),\s*component='([^']+)'\)$/);
  if (branchMatch) {
    return { label: `I(${branchMatch[2]}) · ${kind}`, family: "current", plotFamily: `current-${plotKind}`, unit: kind === "Phase" ? "°" : "A" };
  }

  return { label: `${base} · ${kind}`, family: "value", plotFamily: `value-${plotKind}`, unit: kind === "Phase" ? "°" : "" };
}

function signalLabel(name) {
  return parseSignalName(name).label;
}

function signalUnit(name) {
  return parseSignalName(name).unit;
}

function isInstantaneousSignal(name) {
  return name.endsWith(".instantaneous");
}

function getAcInstantaneousValue(snapshot, name, time) {
  if (!isInstantaneousSignal(name)) return Number(snapshot.signals[name]);
  const magnitude = Number(snapshot.signals[`${name.slice(0, -".instantaneous".length)}.magnitude`]);
  const phaseDegrees = Number(snapshot.signals[`${name.slice(0, -".instantaneous".length)}.phase_deg`]);
  const frequency = Number(snapshot.signals["__live.frequency_hz"]);
  if (!Number.isFinite(magnitude) || !Number.isFinite(phaseDegrees) || !Number.isFinite(frequency)) {
    return Number(snapshot.signals[name]);
  }
  return magnitude * Math.cos(2 * Math.PI * frequency * time + (phaseDegrees * Math.PI) / 180);
}

function buildPlotSamples(points, name) {
  if (!isInstantaneousSignal(name) || points.length < 2) {
    return points.map((snapshot) => ({
      time: Number(snapshot.signals["__live.time_s"]),
      value: Number(snapshot.signals[name]),
    }));
  }

  const samples = [];
  points.forEach((snapshot, index) => {
    if (index === 0) {
      samples.push({ time: Number(snapshot.signals["__live.time_s"]), value: getAcInstantaneousValue(snapshot, name, Number(snapshot.signals["__live.time_s"])) });
      return;
    }

    const previous = points[index - 1];
    const startTime = Number(previous.signals["__live.time_s"]);
    const endTime = Number(snapshot.signals["__live.time_s"]);
    const duration = endTime - startTime;
    const frequency = Number(snapshot.signals["__live.frequency_hz"]);
    const cycles = Number.isFinite(frequency) && frequency > 0 ? Math.abs(duration * frequency) : 0;
    const segments = Math.min(256, Math.max(16, Math.ceil(cycles * 48)));

    for (let segment = 1; segment <= segments; segment += 1) {
      const ratio = segment / segments;
      const time = startTime + duration * ratio;
      const value = getAcInstantaneousValue(snapshot, name, time);
      samples.push({ time, value });
    }
  });

  return samples;
}

function PlotPanel({ points, selectedSignals, title, width = 720, height = 280 }) {
  const margin = { top: 18, right: 22, bottom: 46, left: 64 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xValues = points.map((snapshot) => Number(snapshot.signals["__live.time_s"]));
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const xRange = xMax - xMin || 1;
  const yValues = selectedSignals.flatMap((name) => buildPlotSamples(points, name).map(({ value }) => value).filter(Number.isFinite));
  if (yValues.length < 2) return null;

  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yRange = yMax - yMin || 1;
  const yPad = yRange * 0.08 || 1;
  const chartYMin = yMin - yPad;
  const chartYMax = yMax + yPad;
  const chartYRange = chartYMax - chartYMin || 1;
  const scaleX = (value) => margin.left + ((value - xMin) / xRange) * plotWidth;
  const scaleY = (value) => margin.top + (1 - (value - chartYMin) / chartYRange) * plotHeight;
  const xTicks = xMin === xMax ? [xMin] : [xMin, xMin + xRange / 2, xMax];
  const yTicks = [chartYMin, chartYMin + chartYRange / 2, chartYMax];
  const xScale = getEngineeringScale(xTicks, "s");
  const yScale = getEngineeringScale(yTicks, signalUnit(selectedSignals[0]));

  const paths = selectedSignals.map((name) => {
    const commands = [];
    buildPlotSamples(points, name).forEach(({ time, value }) => {
      if (!Number.isFinite(value) || !Number.isFinite(time)) return;
      commands.push(`${commands.length === 0 ? "M" : "L"} ${scaleX(time).toFixed(2)} ${scaleY(value).toFixed(2)}`);
    });
    return { name, path: commands.join(" ") };
  }).filter((item) => item.path);

  return (
    <div className="border-t border-[#e4e7eb] first:border-t-0">
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#69717b]">{title}</div>
        <div className="text-[10px] text-[#8a929c]">{signalUnit(selectedSignals[0]) || "value"}</div>
      </div>
      <div className="overflow-x-auto px-3 py-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[560px] w-full" role="img" aria-label={`${title} live simulation plot`}>
          {yTicks.map((tick) => { const y = scaleY(tick); return <g key={`y-${tick}`}><line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#e4e7eb" strokeWidth="1" /><text x={margin.left - 9} y={y + 4} textAnchor="end" fontSize="10" fill="#69717b">{formatEngineeringTick(tick, signalUnit(selectedSignals[0]), yScale)}</text></g>; })}
          {xTicks.map((tick) => { const x = scaleX(tick); return <g key={`x-${tick}`}><line x1={x} x2={x} y1={margin.top} y2={height - margin.bottom} stroke="#f0f1f3" strokeWidth="1" /><text x={x} y={height - margin.bottom + 19} textAnchor="middle" fontSize="10" fill="#69717b">{formatEngineeringTick(tick, "s", xScale)}</text></g>; })}
          <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} stroke="#cfd5dc" strokeWidth="1" />
          <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} stroke="#cfd5dc" strokeWidth="1" />
          {paths.map((item, index) => <path key={item.name} d={item.path} fill="none" stroke="currentColor" strokeWidth="2" className={index % 2 === 0 ? "text-[#26364d]" : "text-[#58718f]"} />)}
          <text x={width / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="#69717b">Sample time (s)</text>
          <text x="14" y={height / 2} textAnchor="middle" fontSize="10" fill="#69717b" transform={`rotate(-90 14 ${height / 2})`}>{signalUnit(selectedSignals[0]) || "Signal value"}</text>
        </svg>
      </div>
      <div className="px-4 pb-3 text-[10px] text-[#69717b]">
        {selectedSignals.map((name, index) => <span key={name} className="mr-4 inline-flex max-w-full items-center gap-1.5 align-top"><span className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${index % 2 === 0 ? "bg-[#26364d]" : "bg-[#58718f]"}`} /><span>{signalLabel(name)}</span></span>)}
      </div>
    </div>
  );
}

function LivePlot({ history, selectedSignals }) {
  const points = history.filter((snapshot) => Number.isFinite(Number(snapshot?.signals?.["__live.time_s"])));
  if (points.length < 2 || selectedSignals.length === 0) {
    return <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-[#d9dde2] bg-[#fafbfc] px-4 text-center text-xs text-[#69717b]">Select at least one signal and wait for two live samples to plot it.</div>;
  }

  const groups = selectedSignals.reduce((result, name) => {
    const key = parseSignalName(name).plotFamily;
    if (!result[key]) result[key] = [];
    result[key].push(name);
    return result;
  }, {});

  const titles = {
    "voltage-value": "Voltage",
    "voltage-phase": "Voltage phase",
    "current-value": "Current",
    "current-phase": "Current phase",
    "value-value": "Signal",
    "value-phase": "Signal phase",
    time: "Time",
    frequency: "Frequency",
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#e4e7eb] bg-white">
      <div className="border-b border-[#e4e7eb] px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Live plot</div>
        <div className="mt-1 text-xs text-[#8a929c]">Selected signals versus sample time. Different signal types use separate scales.</div>
        <div className="mt-1 text-[10px] text-[#69717b]">{points.length} samples</div>
      </div>
      {Object.entries(groups).map(([family, names]) => <PlotPanel key={family} points={points} selectedSignals={names} title={titles[family] ?? "Signal"} />)}
    </div>
  );
}

export default function LiveSimulationView({ snapshot, history = [] }) {
  const signals = useMemo(() => Object.entries(snapshot?.signals ?? {}), [snapshot]);
  const signalNames = useMemo(() => signals.map(([name]) => name).filter((name) => name !== "__live.time_s" && name !== "__live.frequency_hz" && history.some((item) => Number.isFinite(Number(item?.signals?.[name])))), [signals, history]);
  const defaultSignals = useMemo(() => {
    const instantaneous = signalNames.filter((name) => name.endsWith(".instantaneous")).slice(0, 2);
    return instantaneous.length > 0 ? instantaneous : signalNames.slice(0, 2);
  }, [signalNames]);
  const [selectedSignalState, setSelectedSignalState] = useState(null);
  const selectedSignals = selectedSignalState === null
    ? defaultSignals
    : selectedSignalState.filter((name) => signalNames.includes(name));

  const toggleSignal = (name) => setSelectedSignalState((current) => {
    const selected = current === null ? defaultSignals : current;
    return selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name];
  });

  const groupedSignalNames = useMemo(() => signalNames.reduce((result, name) => {
    const family = parseSignalName(name).family;
    const key = family === "voltage" ? "Voltages" : family === "current" ? "Currents" : "Other";
    if (!result[key]) result[key] = [];
    result[key].push(name);
    return result;
  }, {}), [signalNames]);

  return (
    <section aria-label="Live simulation state" className="rounded-xl border border-[#d9dde2] bg-white">
      <div className="border-b border-[#e4e7eb] px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Live state</div>
        <div className="mt-1 text-xs text-[#8a929c]">Current sampled values are available for inspection; select signals below to plot their live history.</div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {signals.length === 0 && <div className="text-xs text-[#69717b]">Waiting for the first simulation update.</div>}
        {signals.map(([name, value]) => (
          <div key={name} className="rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-3 py-3">
            <div className="truncate text-[10px] font-medium text-[#69717b]" title={name}>{signalLabel(name)}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-[#17253a]">{formatSignal(value)}{signalUnit(name) && <span className="ml-1 text-[10px] font-medium text-[#8a929c]">{signalUnit(name)}</span>}</div>
          </div>
        ))}
      </div>
      {signalNames.length > 0 && <div className="border-t border-[#e4e7eb] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Plot signals</div>
            <div className="mt-1 text-[11px] text-[#8a929c]">Choose the measurements you want to see.</div>
          </div>
          <div className="shrink-0 text-[10px] font-medium text-[#69717b]">{selectedSignals.length} selected</div>
        </div>
        <div className="mt-3 max-h-44 overflow-y-auto rounded-lg border border-[#e4e7eb] bg-[#fafbfc] p-2">
          {Object.entries(groupedSignalNames).map(([group, names]) => <div key={group} className="mb-2 last:mb-0">
            <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8a929c]">{group}</div>
            <div className="grid gap-1 sm:grid-cols-2">
              {names.map((name) => <label key={name} className="flex min-w-0 cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs text-[#26364d] hover:bg-white"><input className="mt-0.5 shrink-0" type="checkbox" checked={selectedSignals.includes(name)} onChange={() => toggleSignal(name)} /><span className="min-w-0 break-words leading-4">{signalLabel(name)}</span></label>)}
            </div>
          </div>)}
        </div>
      </div>}
      <LivePlot history={history} selectedSignals={selectedSignals} />
    </section>
  );
}
