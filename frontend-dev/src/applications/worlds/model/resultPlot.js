export function createResultPlot({
  xLabel = "X",
  xUnit = "",
  xValues = [],
  series = [],
} = {}) {
  return {
    x: {
      label: xLabel,
      unit: xUnit,
      values: Array.isArray(xValues) ? xValues : [],
    },
    series: Array.isArray(series) ? series : [],
  };
}

export function getPlotSeries(plot) {
  return Array.isArray(plot?.series) ? plot.series : [];
}

export function getPlotRows(plot, series) {
  const xValues = Array.isArray(plot?.x?.values) ? plot.x.values : [];
  const values = Array.isArray(series?.values) ? series.values : [];

  return xValues.map((x, index) => ({
    sweepValue: x,
    value: values[index]?.value,
    failed: values[index]?.failed === true || values[index]?.value === null || values[index]?.value === undefined,
    error: values[index]?.error ?? null,
  }));
}

export function getPlotAxisLabel(axis) {
  if (!axis?.label) return "";
  return axis.unit ? `${axis.label} (${axis.unit})` : axis.label;
}

export function getNearestPlotRow(rows, xValue) {
  if (!Array.isArray(rows) || !Number.isFinite(Number(xValue))) return null;

  let nearest = null;
  let nearestDistance = Infinity;

  for (const row of rows) {
    const rowX = Number(row?.sweepValue);
    if (!Number.isFinite(rowX)) continue;
    const distance = Math.abs(rowX - Number(xValue));
    if (distance < nearestDistance) {
      nearest = row;
      nearestDistance = distance;
    }
  }

  return nearest;
}
