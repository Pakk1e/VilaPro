import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_DC_SWEEP_SETTINGS,
  SIMULATION_ANALYSES,
  createSimulationConfig,
  getDcSweepValidationError,
  getSimulationConfigValidationError,
  getSimulationAnalysisLabel,
} from "./simulationConfig.js";

test("dc sweep is a supported analysis", () => {
  const config = createSimulationConfig({
    analysis: SIMULATION_ANALYSES.DC_SWEEP,
    settings: { ...DEFAULT_DC_SWEEP_SETTINGS, source: "V1" },
  });

  assert.equal(config.analysis, "dc_sweep");
  assert.equal(getSimulationAnalysisLabel(config.analysis), "DC Sweep");
  assert.equal(getSimulationConfigValidationError(config, ["V1"]), null);
});

test("dc sweep rejects a missing source", () => {
  assert.equal(
    getDcSweepValidationError({ start: 0, stop: 10, step: 1 }, ["V1"]),
    "Select a voltage source to sweep."
  );
});

test("dc sweep rejects an unavailable source", () => {
  assert.equal(
    getDcSweepValidationError({ source: "V2", start: 0, stop: 10, step: 1 }, ["V1"]),
    "The selected sweep source is no longer available."
  );
});

test("dc sweep validates step direction and zero step", () => {
  assert.equal(
    getDcSweepValidationError({ source: "V1", start: 0, stop: 10, step: 0 }, ["V1"]),
    "Step cannot be zero."
  );
  assert.equal(
    getDcSweepValidationError({ source: "V1", start: 0, stop: 10, step: -1 }, ["V1"]),
    "Step must be positive when start is below stop."
  );
  assert.equal(
    getDcSweepValidationError({ source: "V1", start: 10, stop: 0, step: 1 }, ["V1"]),
    "Step must be negative when start is above stop."
  );
});

test("operating point keeps the existing default configuration", () => {
  const config = createSimulationConfig();
  assert.equal(config.analysis, SIMULATION_ANALYSES.DC_OPERATING_POINT);
  assert.deepEqual(config.settings, {});
  assert.equal(getSimulationConfigValidationError(config, []), null);
});
