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

const targets = [
  {
    id: "V1-id",
    label: "Supply",
    componentType: "Voltage Source",
    parameters: [{ parameter: "V", label: "Voltage", unit: "V" }],
  },
  {
    id: "I1-id",
    label: "Current",
    componentType: "Current Source",
    parameters: [{ parameter: "I", label: "Current", unit: "A" }],
  },
  {
    id: "R1-id",
    label: "Load",
    componentType: "Resistor",
    parameters: [{ parameter: "R", label: "Resistance", unit: "Ω" }],
  },
];

test("dc sweep is a supported analysis", () => {
  const config = createSimulationConfig({
    analysis: SIMULATION_ANALYSES.DC_SWEEP,
    settings: { ...DEFAULT_DC_SWEEP_SETTINGS, source: "V1" },
  });

  assert.equal(config.analysis, "dc_sweep");
  assert.equal(getSimulationAnalysisLabel(config.analysis), "DC Sweep");
  assert.equal(getSimulationConfigValidationError(config, ["V1"]), null);
});

test("dc sweep accepts current-source target", () => {
  assert.equal(
    getDcSweepValidationError(
      { ...DEFAULT_DC_SWEEP_SETTINGS, source: "I1-id", parameter: "I", start: 0, stop: 0.1, step: 0.05 },
      targets
    ),
    null
  );
});

test("dc sweep accepts component-parameter target", () => {
  assert.equal(
    getDcSweepValidationError(
      { ...DEFAULT_DC_SWEEP_SETTINGS, source: "R1-id", parameter: "R", start: 50, stop: 150, step: 50 },
      targets
    ),
    null
  );
});

test("dc sweep rejects an unavailable parameter", () => {
  assert.equal(
    getDcSweepValidationError(
      { ...DEFAULT_DC_SWEEP_SETTINGS, source: "R1-id", parameter: "V", start: 0, stop: 10, step: 1 },
      targets
    ),
    "The selected sweep parameter is no longer available."
  );
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
