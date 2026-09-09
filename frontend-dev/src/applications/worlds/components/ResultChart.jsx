import { useState } from "react";

import { getNearestPlotRow, getPlotAxisLabel, getPlotRows, getPlotSeriesLabel, getPlotSeriesQuantityLabel } from "../model/resultPlot.js";
import { formatEngineeringValue, formatEngineeringTick, getEngineeringScale } from "../model/engineeringFormat.js";




function getFiniteRows(rows) {
  return rows.filter((row) => Number.isFinite(Number(row.sweepValue)) && Number.isFinite(Number(row.value)) && !row.failed);
}

function getPathSegments(rows, scaleX, scaleY) {
  const segments = [];
  let segment = [];
  for (const row of rows) {
    if (row.failed || !Number.isFinite(Number(row.sweepValue)) || !Number.isFinite(Number(row.value))) {
      if (segment.length > 0) segments.push(segment);
      segment = [];
      continue;
    }
    segment.push(row);
  }
  if (segment.length > 0) segments.push(segment);
  return segments.map((segmentRows) => segmentRows.map((row, index) => `${index === 0 ? "M" : "L"} ${scaleX(Number(row.sweepValue)).toFixed(2)} ${scaleY(Number(row.value)).toFixed(2)}`).join(" "));
}

export default function ResultChart({ plot, series }) {
  const rows = getPlotRows(plot, series);
  const points = getFiniteRows(rows);
  const failedRows = rows.filter((row) => row.failed && Number.isFinite(Number(row.sweepValue)));
  const [selectedRow, setSelectedRow] = useState(null);
  const xLabel = getPlotAxisLabel(plot?.x);
  const baseYLabel = getPlotSeriesLabel(series);
  const quantityLabel = getPlotSeriesQuantityLabel(series);

  if (points.length < 2) {
    return <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-[#d9dde2] bg-[#fafbfc] px-4 text-center text-xs text-[#69717b]">At least two valid result points are required to plot the response.</div>;
  }

  const width = 720;
  const height = 300;
  const margin = { top: 18, right: 22, bottom: 46, left: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xValues = rows.filter((row) => Number.isFinite(Number(row.sweepValue))).map((row) => Number(row.sweepValue));
  const yValues = points.map((point) => Number(point.value));
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const yPad = yRange * 0.08 || 1;
  const chartYMin = yMin - yPad;
  const chartYMax = yMax + yPad;
  const chartYRange = chartYMax - chartYMin || 1;
  const scaleX = (value) => margin.left + ((value - xMin) / xRange) * plotWidth;
  const scaleY = (value) => margin.top + (1 - (value - chartYMin) / chartYRange) * plotHeight;
  const xTicks = xMin === xMax ? [xMin] : [xMin, xMin + xRange / 2, xMax];
  const yTicks = [chartYMin, chartYMin + chartYRange / 2, chartYMax];
  const yScale = getEngineeringScale(yTicks, series?.unit);
  const xScale = getEngineeringScale(xTicks, plot?.x?.unit);
  const yLabel = series?.unit
    ? baseYLabel.replace(`(${series.unit})`, `(${yScale.symbol})`)
    : baseYLabel;
  const paths = getPathSegments(rows, scaleX, scaleY);

  const selectAtX = (xValue) => {
    const nearest = getNearestPlotRow(rows, xValue);
    setSelectedRow(nearest?.failed ? null : nearest);
  };

  const handleChartClick = (event) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * width;
    const clampedX = Math.max(margin.left, Math.min(width - margin.right, svgX));
    const xValue = xMin + ((clampedX - margin.left) / plotWidth) * xRange;
    selectAtX(xValue);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#e4e7eb] bg-white">
      <div className="flex items-center justify-between border-b border-[#e4e7eb] px-4 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Result Plot</div>
          <div className="mt-1 text-xs text-[#8a929c]">{yLabel} versus {xLabel}</div>
        </div>
        <div className="text-[10px] text-[#69717b]">{points.length} valid points{failedRows.length > 0 ? ` · ${failedRows.length} failed` : ""}</div>
      </div>
      <div className="border-b border-[#e4e7eb] bg-[#fafbfc] px-4 py-2.5">
        {selectedRow ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#26364d]" aria-live="polite">
            <span><span className="text-[#69717b]">{xLabel}:</span> <strong className="font-mono">{formatEngineeringValue(selectedRow.sweepValue, plot?.x?.unit)}</strong></span>
            <span><span className="text-[#69717b]">{yLabel}:</span> <strong className="font-mono">{formatEngineeringValue(selectedRow.value, series?.unit)}</strong></span>
            <button type="button" onClick={() => setSelectedRow(null)} className="ml-auto text-[10px] font-medium text-[#58718f] hover:underline">Clear</button>
          </div>
        ) : <div className="text-[10px] text-[#69717b]">Click the plot to inspect the nearest result point.</div>}
      </div>
      <div className="overflow-x-auto px-3 py-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[560px] w-full cursor-crosshair" role="img" aria-label={`${yLabel} versus ${xLabel} result plot`} onClick={handleChartClick}>
          {yTicks.map((tick) => { const y = scaleY(tick); return <g key={`y-${tick}`}><line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#e4e7eb" strokeWidth="1" /><text x={margin.left - 9} y={y + 4} textAnchor="end" fontSize="10" fill="#69717b">{formatEngineeringTick(tick, series?.unit, yScale)}</text></g>; })}
          {xTicks.map((tick) => { const x = scaleX(tick); return <g key={`x-${tick}`}><line x1={x} x2={x} y1={margin.top} y2={height - margin.bottom} stroke="#f0f1f3" strokeWidth="1" /><text x={x} y={height - margin.bottom + 19} textAnchor="middle" fontSize="10" fill="#69717b">{formatEngineeringTick(tick, plot?.x?.unit, xScale)}</text></g>; })}
          <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} stroke="#cfd5dc" strokeWidth="1" />
          <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} stroke="#cfd5dc" strokeWidth="1" />
          {paths.map((path, index) => <path key={`path-${index}`} d={path} fill="none" stroke="currentColor" strokeWidth="2" className="text-[#26364d]" />)}
          {points.map((point, index) => { const selected = selectedRow?.sweepValue === point.sweepValue && selectedRow?.value === point.value; return <circle key={`${point.sweepValue}-${index}`} cx={scaleX(Number(point.sweepValue))} cy={scaleY(Number(point.value))} r={selected ? "5" : "3.5"} fill="currentColor" className="text-[#26364d]" onClick={(event) => { event.stopPropagation(); setSelectedRow(point); }} />; })}
          {selectedRow && <line x1={scaleX(Number(selectedRow.sweepValue))} x2={scaleX(Number(selectedRow.sweepValue))} y1={margin.top} y2={height - margin.bottom} stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" className="text-[#58718f]" pointerEvents="none" />}
          {failedRows.map((row, index) => { const x = scaleX(Number(row.sweepValue)); const y = margin.top + plotHeight / 2; return <g key={`failed-${row.sweepValue}-${index}`} className="text-red-700"><title>{row.error ?? "Result point failed"}</title><line x1={x - 4} x2={x + 4} y1={y - 4} y2={y + 4} stroke="currentColor" strokeWidth="1.5" /><line x1={x - 4} x2={x + 4} y1={y + 4} y2={y - 4} stroke="currentColor" strokeWidth="1.5" /></g>; })}
          <text x={width / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="#69717b">{xLabel}</text>
          <text x="14" y={height / 2} textAnchor="middle" fontSize="10" fill="#69717b" transform={`rotate(-90 14 ${height / 2})`}>{yLabel}</text>
        </svg>
      </div>
    </div>
  );
}
