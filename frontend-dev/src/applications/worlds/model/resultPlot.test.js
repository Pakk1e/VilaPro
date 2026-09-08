import test from "node:test";
import assert from "node:assert/strict";

import { createResultPlot, getNearestPlotRow, getPlotAxisLabel, getPlotRows, getPlotSeries, getPlotSeriesLabel, getPlotSeriesQuantityLabel } from "./resultPlot.js";

test("result plot keeps the independent variable separate from response series", () => {
  const plot = createResultPlot({
    xLabel: "Voltage Source 1",
    xUnit: "V",
    xValues: [0, 1, 2],
    series: [{ key: "node:node_1", label: "V(Node 1)", unit: "V", values: [{ value: 0 }, { value: 1 }, { value: 2 }] }],
  });

  assert.deepEqual(plot.x, { key: "independent", label: "Voltage Source 1", unit: "V", values: [0, 1, 2] });
  assert.equal(getPlotSeries(plot).length, 1);
  assert.deepEqual(getPlotRows(plot, plot.series[0]), [
    { sweepValue: 0, value: 0, failed: false, error: null },
    { sweepValue: 1, value: 1, failed: false, error: null },
    { sweepValue: 2, value: 2, failed: false, error: null },
  ]);
});

test("result plot accepts explicit independent-variable metadata and normalizes series metadata", () => {
  const plot = createResultPlot({
    independentVariable: { key: "time", label: "Time", unit: "s", values: [0, 0.5, 1] },
    series: [{ key: "v:out", label: "V(Out)", measurementType: "voltage", unit: "V", values: [] }],
  });

  assert.deepEqual(plot.x, { key: "time", label: "Time", unit: "s", values: [0, 0.5, 1] });
  assert.equal(plot.series[0].quantity, "voltage");
  assert.equal(plot.series[0].unit, "V");
  assert.equal(getPlotSeriesLabel(plot.series[0]), "V(Out) (V)");
  assert.equal(getPlotSeriesQuantityLabel(plot.series[0]), "Voltage");
});

test("result plot preserves missing and failed response points", () => {
  const plot = createResultPlot({ xValues: [0, 1, 2], series: [{ values: [{ value: 0 }, { failed: true, error: "singular matrix" }] }] });

  assert.deepEqual(getPlotRows(plot, plot.series[0]), [
    { sweepValue: 0, value: 0, failed: false, error: null },
    { sweepValue: 1, value: undefined, failed: true, error: "singular matrix" },
    { sweepValue: 2, value: undefined, failed: true, error: null },
  ]);
});

test("plot axis labels include units only when available", () => {
  assert.equal(getPlotAxisLabel({ label: "Voltage", unit: "V" }), "Voltage (V)");
  assert.equal(getPlotAxisLabel({ label: "Time" }), "Time");
  assert.equal(getPlotAxisLabel(null), "");
});

test("result plot can select the nearest sweep point for inspection", () => {
  const rows = [
    { sweepValue: 0, value: 0, failed: false, error: null },
    { sweepValue: 1, value: 2, failed: false, error: null },
    { sweepValue: 2, value: 4, failed: false, error: null },
  ];

  assert.deepEqual(getNearestPlotRow(rows, 1.7), rows[2]);
  assert.deepEqual(getNearestPlotRow(rows, 0.4), rows[0]);
  assert.equal(getNearestPlotRow(rows, "not-a-number"), null);
});
