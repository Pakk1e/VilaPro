import test from "node:test";
import assert from "node:assert/strict";

import { getSweepInformation, getSweepSourceRows, getSweepValues } from "./sweepResults.js";

const result = {
  analysis: "dc_sweep",
  result: {
    datasets: [
      { name: "sweep", values: [0, 2, 4], dimensions: ["sweep"] },
      {
        name: "components",
        values: [
          [{ id: "V1", voltage: 0, current: 0, power: 0 }],
          [{ id: "V1", voltage: 2, current: -0.02, power: -0.04 }],
          [{ id: "V1", voltage: 4, current: -0.04, power: -0.16 }],
        ],
        dimensions: ["sweep", "component"],
      },
    ],
    analysis_information: {
      analysis: "dc_sweep",
      settings: { source: "V1", start: 0, stop: 4, step: 2 },
      sweep: { source: "V1", parameter: "V" },
    },
  },
};

test("sweep helpers expose independent variable and source series", () => {
  assert.deepEqual(getSweepValues(result), [0, 2, 4]);
  assert.deepEqual(getSweepInformation(result), {
    source: "V1",
    parameter: "V",
    start: 0,
    stop: 4,
    step: 2,
  });
  assert.deepEqual(getSweepSourceRows(result), [
    { sweepValue: 0, voltage: 0, current: 0, power: 0, failed: false },
    { sweepValue: 2, voltage: 2, current: -0.02, power: -0.04, failed: false },
    { sweepValue: 4, voltage: 4, current: -0.04, power: -0.16, failed: false },
  ]);
});

test("missing sweep point data is marked as failed without losing the sweep value", () => {
  const incomplete = {
    ...result,
    result: {
      ...result.result,
      datasets: result.result.datasets.map((dataset) => dataset.name === "components"
        ? { ...dataset, values: [dataset.values[0], dataset.values[1]] }
        : dataset),
    },
  };

  assert.deepEqual(getSweepSourceRows(incomplete)[2], {
    sweepValue: 4,
    voltage: undefined,
    current: undefined,
    power: undefined,
    failed: true,
  });
});

test("non-sweep results do not expose sweep information", () => {
  assert.equal(getSweepInformation({ analysis: "dc_operating_point", result: {} }), null);
  assert.deepEqual(getSweepSourceRows({ analysis: "dc_operating_point", result: {} }), []);
});
