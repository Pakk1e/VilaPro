import { useEffect, useMemo, useState } from "react";

import { formatEngineeringTick, getEngineeringScale } from "../model/engineeringFormat.js";

function formatSignal(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return String(value);
  return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 8 }).format(value);
}

function signalLabel(name) {
  if (name === "__live.time_s") return "Sample time";
  if (name === "__live.frequency_hz") return "Frequency";
  return name.replace(/\.instantaneous$/, " · instantaneous").replace(/\.magnitude$/, " · magnitude").replace(/\.phase_deg$/, " · phase");
}

function signalUnit(name) {
  if (name === "__live.time_s") return "s";
  if (name === "__live.frequency_hz") return "Hz";
  if (name.endsWith(".magnitude")) return "|·|";
  if (name.endsWith(".phase_deg")) return "°";
  return "";
}

function LivePlot({ history, selectedSignals }) {
  const points = history.filter((snapshot) => Number.isFinite(Number(snapshot?.signals?.["__live.time_s"])));
  if (points.length < 2 || selectedSignals.length === 0) {
    return <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-[#d9dde2] bg-[#fafbfc] px-4 text-center text-xs text-[#69717b]">Select at least one signal and wait for two live samples to plot it.</div>;
  }

  const width = 720;
  const height = 300;
  const margin = { top: 18, right: 22, bottom: 46, left: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xValues = points.map((snapshot) => Number(snapshot.signals["__live.time_s"]));
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const xRange = xMax - xMin || 1;
  const yValues = selectedSignals.flatMap((name) => points.map((snapshot) => Number(snapshot.signals[name])).filter(Number.isFinite));
  if (yValues.length < 2) {
    return <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-[#d9dde2] bg-[#fafbfc] px-4 text-center text-xs text-[#69717b]">The selected signals do not contain enough numeric samples to plot.</div>;
  }
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
  const yScale = getEngineeringScale(yTicks, "");

  const paths = selectedSignals.map((name) => {
    const commands = [];
    let started = false;
    points.forEach((snapshot) => {
      const xValue = Number(snapshot.signals["__live.time_s"]);
      const yValue = Number(snapshot.signals[name]);
      if (!Number.isFinite(yValue)) { started = false; return; }
      commands.push(`${started ? "L" : "M"} ${scaleX(xValue).toFixed(2)} ${scaleY(yValue).toFixed(2)}`);
      started = true;
    });
    return { name, path: commands.join(" ") };
  }).filter((item) => item.path);

  return (
    <div className="overflow-hidden rounded-lg border border-[#e4e7eb] bg-white">
      <div className="flex items-center justify-between border-b border-[#e4e7eb] px-4 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Live plot</div>
          <div className="mt-1 text-xs text-[#8a929c]">Selected signals versus sample time.</div>
        </div>
        <div className="text-[10px] text-[#69717b]">{points.length} samples</div>
      </div>
      <div className="overflow-x-auto px-3 py-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[560px] w-full" role="img" aria-label="Live simulation plot">
          {yTicks.map((tick) => { const y = scaleY(tick); return <g key={`y-${tick}`}><line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#e4e7eb" strokeWidth="1" /><text x={margin.left - 9} y={y + 4} textAnchor="end" fontSize="10" fill="#69717b">{formatEngineeringTick(tick, "", yScale)}</text></g>; })}
          {xTicks.map((tick) => { const x = scaleX(tick); return <g key={`x-${tick}`}><line x1={x} x2={x} y1={margin.top} y2={height - margin.bottom} stroke="#f0f1f3" strokeWidth="1" /><text x={x} y={height - margin.bottom + 19} textAnchor="middle" fontSize="10" fill="#69717b">{formatEngineeringTick(tick, "s", xScale)}</text></g>; })}
          <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} stroke="#cfd5dc" strokeWidth="1" />
          <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} stroke="#cfd5dc" strokeWidth="1" />
          {paths.map((item, index) => <path key={item.name} d={item.path} fill="none" stroke="currentColor" strokeWidth="2" className={index % 2 === 0 ? "text-[#26364d]" : "text-[#58718f]"} />)}
          <text x={width / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="#69717b">Sample time (s)</text>
          <text x="14" y={height / 2} textAnchor="middle" fontSize="10" fill="#69717b" transform={`rotate(-90 14 ${height / 2})`}>Signal value</text>
        </svg>
      </div>
      <div className="border-t border-[#e4e7eb] px-4 py-2.5 text-[10px] text-[#69717b]">{selectedSignals.map((name, index) => <span key={name} className="mr-4 inline-flex items-center gap-1.5"><span className={`inline-block h-2 w-2 rounded-full ${index % 2 === 0 ? "bg-[#26364d]" : "bg-[#58718f]"}`} />{signalLabel(name)}</span>)}</div>
    </div>
  );
}

export default function LiveSimulationView({ snapshot, history = [] }) {
  const signals = useMemo(() => Object.entries(snapshot?.signals ?? {}), [snapshot]);
  const signalNames = useMemo(() => signals.map(([name]) => name).filter((name) => name !== "__live.time_s" && name !== "__live.frequency_hz" && history.some((item) => Number.isFinite(Number(item?.signals?.[name])))), [signals, history]);
  const [selectedSignals, setSelectedSignals] = useState([]);

  useEffect(() => {
    setSelectedSignals((current) => {
      const valid = current.filter((name) => signalNames.includes(name));
      if (valid.length > 0) {
        const unchanged = valid.length === current.length && valid.every((name, index) => name === current[index]);
        return unchanged ? current : valid;
      }
      const defaults = signalNames.filter((name) => name.endsWith(".instantaneous")).slice(0, 2);
      return defaults.length > 0 ? defaults : signalNames.slice(0, 2);
    });
  }, [signalNames]);

  const toggleSignal = (name) => setSelectedSignals((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);

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
      {signalNames.length > 0 && <div className="border-t border-[#e4e7eb] px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Plot signals</div><div className="mt-2 flex max-h-28 flex-wrap gap-x-4 gap-y-2 overflow-y-auto">{signalNames.map((name) => <label key={name} className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#26364d]"><input type="checkbox" checked={selectedSignals.includes(name)} onChange={() => toggleSignal(name)} />{signalLabel(name)}</label>)}</div></div>}
      <LivePlot history={history} selectedSignals={selectedSignals} />
    </section>
  );
}
