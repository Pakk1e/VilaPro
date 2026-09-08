import test from "node:test";
import assert from "node:assert/strict";

import { createResultPlot, getPlotAxisLabel, getPlotRows, getPlotSeries } from "./resultPlot.js";

test("result plot keeps the independent variable separate from response series", () => {
  const plot = createResultPlot({
    xLabel: "Voltage Source 1",
    xUnit: "V",
    xValues: [0, 1, 2],
    series: [{ key: "node:node_1", label: "V(Node 1)", unit: "V", values: [{ value: 0 }, { value: 1 }, { value: 2 }] }],
  });

  assert.deepEqual(plot.x, { label: "Voltage Source 1", unit: "V", values: [0, 1, 2] });
  assert.equal(getPlotSeries(plot).length, 1);
  assert.deepEqual(getPlotRows(plot, plot.series[0]), [
    { sweepValue: 0, value: 0, failed: false, error: null },
    { sweepValue: 1, value: 1, failed: false, error: null },
    { sweepValue: 2, value: 2, failed: false, error: null },
  ]);
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
