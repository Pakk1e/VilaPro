function normalizeAxis(axis, fallbackLabel = "X") {
  return {
    key: axis?.key ?? "independent",
    label: axis?.label ?? fallbackLabel,
    unit: axis?.unit ?? "",
    values: Array.isArray(axis?.values) ? axis.values : [],
  };
}

function normalizeSeries(series) {
  return {
    key: series?.key ?? "series",
    label: series?.label ?? "Response",
    quantity: series?.quantity ?? series?.measurementType ?? "measurement",
    unit: series?.unit ?? "",
    values: Array.isArray(series?.values) ? series.values : [],
    ...series,
  };
}

export function createResultPlot({
  xLabel = "X",
  xUnit = "",
  xKey = "independent",
  xValues = [],
  independentVariable,
  series = [],
} = {}) {
  const x = independentVariable
    ? normalizeAxis(independentVariable, xLabel)
    : normalizeAxis({ key: xKey, label: xLabel, unit: xUnit, values: xValues }, xLabel);

  return {
    x,
    series: Array.isArray(series) ? series.map(normalizeSeries) : [],
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

export function getPlotSeriesLabel(series) {
  if (!series) return "Response";
  return series.unit ? `${series.label ?? "Response"} (${series.unit})` : series.label ?? "Response";
}

export function getPlotSeriesQuantityLabel(series) {
  const quantityLabels = {
    voltage: "Voltage",
    current: "Current",
    power: "Power",
    resistance: "Resistance",
    time: "Time",
    frequency: "Frequency",
  };
  return quantityLabels[series?.quantity] ?? series?.quantityLabel ?? "Response";
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
