import test from "node:test";
import assert from "node:assert/strict";
import { getCircuitSummaryRows, getEntityMeasurementSeries, getOperatingPointResponseSeries, getSummaryValue } from "./resultExplorer.js";
import { RESULT_MEASUREMENTS } from "./sweepResults.js";

const result = {
  analysis: "dc_operating_point",
  result: {
    circuit_context: {
      nodes: [
        { id: "ground", label: "Ground", is_ground: true, connections: [] },
        { id: "node_1", label: "Node 1", is_ground: false, connections: [] },
      ],
      components: [
        { id: "R1", name: "Load", type: "Resistor", ports: { p: { node: "node_1" }, n: { node: "ground" } } },
      ],
      branches: [],
    },
  },
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
  assert.equal(
    getEntityMeasurementSeries(series, "component", "R1", RESULT_MEASUREMENTS.CURRENT)?.values[0]?.value,
    0.01,
  );
});

test("summary value uses the latest successful point", () => {
  const series = { values: [
    { value: 1, failed: false },
    { value: 2, failed: false },
    { value: null, failed: true, error: "solver failed" },
  ] };
  assert.equal(getSummaryValue(series), 2);
  assert.equal(getSummaryValue({ values: [{ value: null, failed: true }] }), null);
  assert.equal(getSummaryValue(null), null);
});
