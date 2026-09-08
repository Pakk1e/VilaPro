import test from "node:test";
import assert from "node:assert/strict";
import { getExplorerMeasurements, getExplorerSeries, getOperatingPointResponseSeries } from "./resultExplorer.js";
import { RESULT_MEASUREMENTS, RESULT_SCOPES } from "./sweepResults.js";

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

test("explorer measurements follow the selected scope", () => {
  const series = getOperatingPointResponseSeries(result);
  assert.deepEqual(getExplorerMeasurements(RESULT_SCOPES.COMPONENTS, series), [
    RESULT_MEASUREMENTS.VOLTAGE,
    RESULT_MEASUREMENTS.CURRENT,
    RESULT_MEASUREMENTS.POWER,
  ]);
  assert.deepEqual(getExplorerMeasurements(RESULT_SCOPES.NODES, series), [RESULT_MEASUREMENTS.VOLTAGE]);
  assert.equal(getExplorerSeries(series, RESULT_SCOPES.NODES, RESULT_MEASUREMENTS.VOLTAGE).length, 2);
});
