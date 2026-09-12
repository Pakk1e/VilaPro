import test from "node:test";
import assert from "node:assert/strict";
import { getCircuitSummaryRows, getEntityMeasurementSeries, getExplorerMeasurements, getExplorerSeries, getOperatingPointResponseSeries, getSummaryValue, getVisualizationSeries } from "./resultExplorer.js";
import { RESULT_MEASUREMENTS } from "./sweepResults.js";
import { createResultPlot } from "./resultPlot.js";

const result = {
  analysis: "dc_operating_point",
  result: { circuit_context: { nodes: [{ id: "ground", label: "Ground", is_ground: true, connections: [] }, { id: "node_1", label: "Node 1", is_ground: false, connections: [] }], components: [{ id: "R1", name: "Load", type: "Resistor", ports: { p: { node: "node_1" }, n: { node: "ground" } } }], branches: [] } },
  components: { R1: { id: "R1", name: "Load", type: "Resistor", voltage: 5, current: 0.01, power: 0.05 } },
  node_voltages: { ground: 0, node_1: 5 },
  branch_currents: {},
};

test("operating point exposes component V/I/P and node voltage series", () => {
  const series = getOperatingPointResponseSeries(result);
  assert.ok(series.some((item) => item.key === "component:R1:voltage"));
  assert.ok(series.some((item) => item.key === "component:R1:current"));
  assert.ok(series.some((item) => item.key === "component:R1:power"));
  assert.ok(series.some((item) => item.key === "node:node_1"));
});

test("circuit summary combines measurements into one row per circuit entity", () => {
  const series = getOperatingPointResponseSeries(result);
  const rows = getCircuitSummaryRows(series);
  const componentRow = rows.find((row) => row.entityId === "R1");
  const nodeRow = rows.find((row) => row.entityId === "node_1");
  assert.equal(componentRow.label, "Load");
  assert.equal(componentRow.values[RESULT_MEASUREMENTS.VOLTAGE].unit, "V");
  assert.equal(componentRow.values[RESULT_MEASUREMENTS.CURRENT].unit, "A");
  assert.equal(componentRow.values[RESULT_MEASUREMENTS.POWER].unit, "W");
  assert.equal(nodeRow.label, "Node 1");
  assert.ok(nodeRow.values[RESULT_MEASUREMENTS.VOLTAGE]);
  assert.equal(nodeRow.values[RESULT_MEASUREMENTS.CURRENT], undefined);
});

test("entity measurement lookup returns the series used by result selection", () => {
  const series = getOperatingPointResponseSeries(result);
  assert.equal(getEntityMeasurementSeries(series, "component", "R1", RESULT_MEASUREMENTS.CURRENT)?.values[0]?.value, 0.01);
});

test("summary value uses the latest successful point", () => {
  const series = { values: [{ value: 1, failed: false }, { value: 2, failed: false }, { value: null, failed: true, error: "solver failed" }] };
  assert.equal(getSummaryValue(series), 2);
  assert.equal(getSummaryValue({ values: [{ value: null, failed: true }] }), null);
  assert.equal(getSummaryValue(null), null);
});

test("transient visualization preserves explicit time axis metadata", () => {
  const series = getVisualizationSeries({ visualization: { plots: [{ independent_variable: { key: "time", label: "Time", unit: "s", values: [0, 0.001, 0.002] }, series: [{ id: "node:n1", label: "V(out)", quantity: "voltage", unit: "V", source: "node:n1", y: [0, 1, 2] }] }] } });
  assert.equal(series[0].xKey, "time");
  assert.equal(series[0].xLabel, "Time");
  assert.equal(series[0].xUnit, "s");
  assert.deepEqual(series[0].xValues, [0, 0.001, 0.002]);
});

test("transient response series remain aligned with the shared time axis", () => {
  const series = getVisualizationSeries({ visualization: { plots: [{ independent_variable: { key: "time", label: "Time", unit: "s", values: [0, 1, 2] }, series: [{ id: "a", quantity: "voltage", unit: "V", source: "node:a", y: [1, 2, 3] }, { id: "b", quantity: "current", unit: "A", source: "branch:b", y: [4, 5, 6] }] }] } });
  assert.equal(series.length, 2);
  assert.deepEqual(series[0].xValues, series[1].xValues);
  assert.deepEqual(series[0].values.map((point) => point.value), [1, 2, 3]);
  assert.deepEqual(series[1].values.map((point) => point.value), [4, 5, 6]);
});

test("missing transient samples remain failed instead of being dropped", () => {
  const series = getVisualizationSeries({ visualization: { plots: [{ independent_variable: { key: "time", label: "Time", unit: "s", values: [0, 1, 2] }, series: [{ id: "v", quantity: "voltage", unit: "V", source: "node:n1", y: [1, null, 3] }] }] } });
  assert.equal(series[0].values.length, 3);
  assert.equal(series[0].values[1].failed, true);
  assert.equal(series[0].values[1].value, null);
});

test("non-finite transient samples are failed and normalized", () => {
  const series = getVisualizationSeries({ visualization: { plots: [{ independent_variable: { key: "time", label: "Time", unit: "s", values: [0, 1, 2, 3] }, series: [{ id: "v", quantity: "voltage", unit: "V", source: "node:n1", y: [1, Number.NaN, Number.POSITIVE_INFINITY, 4] }] }] } });
  assert.deepEqual(series[0].values, [
    { value: 1, failed: false, error: null },
    { value: null, failed: true, error: "Result value is not finite." },
    { value: null, failed: true, error: "Result value is not finite." },
    { value: 4, failed: false, error: null },
  ]);
});

test("result plot uses canonical time axis for transient response", () => {
  const plot = createResultPlot({ independentVariable: { key: "time", label: "Time", unit: "s", values: [0, 0.5, 1] }, series: [{ key: "v", label: "V(out)", quantity: "voltage", unit: "V", values: [{ value: 0 }, { value: 2 }, { value: 1 }] }] });
  assert.deepEqual(plot.x, { key: "time", label: "Time", unit: "s", values: [0, 0.5, 1] });
  assert.equal(plot.series[0].quantity, "voltage");
});

test("component transient series are grouped into explorer component measurements", () => {
  const series = getVisualizationSeries({ visualization: { plots: [{ id: "rlc", independent_variable: { key: "time", label: "Time", unit: "s", values: [0, 1] }, series: [
    { id: "components:C1:voltage", label: "V(C1)", quantity: "voltage", unit: "V", source: "component:C1", y: [0, 1] },
    { id: "components:C1:current", label: "I(C1)", quantity: "current", unit: "A", source: "component:C1", y: [0, 2] },
    { id: "components:C1:power", label: "P(C1)", quantity: "power", unit: "W", source: "component:C1", y: [0, 2] },
  ] }] } });
  assert.deepEqual(getExplorerMeasurements("components", series), ["voltage", "current", "power"]);
  assert.equal(getExplorerSeries(series, "components", "current")[0].entityId, "C1");
  assert.equal(getExplorerSeries(series, "components", "current")[0].label, "I(C1)");
});

test("component transient summary keeps latest valid V/I/P values", () => {
  const series = getVisualizationSeries({ visualization: { plots: [{ independent_variable: { key: "time", label: "Time", unit: "s", values: [0, 1, 2] }, series: [
    { id: "components:L1:voltage", label: "V(L1)", quantity: "voltage", unit: "V", source: "component:L1", y: [0, 3, null] },
    { id: "components:L1:current", label: "I(L1)", quantity: "current", unit: "A", source: "component:L1", y: [0, 1, null] },
    { id: "components:L1:power", label: "P(L1)", quantity: "power", unit: "W", source: "component:L1", y: [0, 3, null] },
  ] }] } });
  const row = getCircuitSummaryRows(series)[0];
  assert.equal(row.entityType, "component");
  assert.equal(getSummaryValue(row.values.voltage), 3);
  assert.equal(getSummaryValue(row.values.current), 1);
  assert.equal(getSummaryValue(row.values.power), 3);
});
