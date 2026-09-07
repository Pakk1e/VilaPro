import test from "node:test";
import assert from "node:assert/strict";

import { getSimulationStatus, getSimulationStatusLabel, SIMULATION_STATUS } from "./simulationState.js";


test("simulation result becomes stale when the circuit or setup changes", () => {
  const status = getSimulationStatus({
    result: { analysis: "dc_operating_point" },
    running: false,
    error: null,
    simulationIsStale: true,
  });

  assert.equal(status, SIMULATION_STATUS.STALE);
  assert.equal(getSimulationStatusLabel(status), "Out of date");
});


test("current simulation result remains current when signatures match", () => {
  const status = getSimulationStatus({
    result: { analysis: "dc_operating_point" },
    running: false,
    error: null,
    simulationIsStale: false,
  });

  assert.equal(status, SIMULATION_STATUS.CURRENT);
  assert.equal(getSimulationStatusLabel(status), "Up to date");
});
