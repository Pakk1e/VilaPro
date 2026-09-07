import test from "node:test";
import assert from "node:assert/strict";

import {
  getSweepInformation,
  getSweepPointStatuses,
  getSweepResponseSeries,
  getSweepSourceRows,
  getSweepValues,
} from "./sweepResults.js";

const result = {
  analysis: "dc_sweep",
  result: {
    datasets: [
      { name: "sweep", values: [0, 1, 2], dimensions: ["sweep"] },
      {
        name: "sweep_status",
        values: [
          { status: "completed" },
          { status: "failed", error: "singular matrix" },
          { status: "completed" },
        ],
        dimensions: ["sweep"],
      },
      {
        name: "node_voltages",
        values: [
          { ground: 0, node_1: 0 },
          null,
          { ground: 0, node_1: 2 },
        ],
        dimensions: ["sweep", "node"],
      },
      {
        name: "branch_currents",
        values: [
          { "node_1->ground": 0 },
          null,
          { "node_1->ground": -0.02 },
        ],
        dimensions: ["sweep", "branch"],
      },
      {
        name: "components",
        values: [
          [{ id: "V1", name: "Supply", voltage: 0, current: 0, power: 0 }],
          null,
          [{ id: "V1", name: "Supply", voltage: 2, current: -0.02, power: -0.04 }],
        ],
        dimensions: ["sweep", "component"],
      },
    ],
    analysis_information: {
      analysis: "dc_sweep",
      settings: { source: "V1", start: 0, stop: 2, step: 1 },
      sweep: { source: "V1", parameter: "V" },
    },
  },
};

test("sweep helpers expose the independent variable and source series", () => {
  assert.deepEqual(getSweepValues(result), [0, 1, 2]);
  assert.deepEqual(getSweepInformation(result), {
    source: "V1",
    parameter: "V",
    start: 0,
    stop: 2,
    step: 1,
  });
  assert.equal(getSweepSourceRows(result)[1].failed, true);
});

test("failed sweep points retain their status and error", () => {
  assert.deepEqual(getSweepPointStatuses(result), [
    { status: "completed" },
    { status: "failed", error: "singular matrix" },
    { status: "completed" },
  ]);
});

test("response series expose nodes, branches and component quantities", () => {
  const series = getSweepResponseSeries(result);
  const labels = series.map((item) => item.label);

  assert.ok(labels.includes("V(node_1)"));
  assert.ok(labels.includes("I(node_1->ground)"));
  assert.ok(labels.includes("V(Supply)"));
  assert.ok(labels.includes("I(Supply)"));
  assert.ok(labels.includes("P(Supply)"));

  const nodeSeries = series.find((item) => item.label === "V(node_1)");
  assert.deepEqual(nodeSeries.values.map((item) => item.value), [0, undefined, 2]);
  assert.equal(nodeSeries.values[1].failed, true);
});

test("missing sweep point data remains aligned with the independent variable", () => {
  const incomplete = {
    ...result,
    result: {
      ...result.result,
      datasets: result.result.datasets.map((dataset) => dataset.name === "sweep_status"
        ? { ...dataset, values: [{ status: "completed" }] }
        : dataset),
    },
  };

  assert.deepEqual(getSweepPointStatuses(incomplete), [
    { status: "completed" },
    { status: "failed", error: "No result status was returned." },
    { status: "failed", error: "No result status was returned." },
  ]);
});

test("non-sweep results do not expose sweep information", () => {
  assert.equal(getSweepInformation({ analysis: "dc_operating_point", result: {} }), null);
  assert.deepEqual(getSweepSourceRows({ analysis: "dc_operating_point", result: {} }), []);
});
