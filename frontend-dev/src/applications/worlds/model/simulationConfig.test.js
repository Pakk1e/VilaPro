import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_AC_SETTINGS,
  DEFAULT_DC_SWEEP_SETTINGS,
  SIMULATION_ANALYSES,
  SIMULATION_MODES,
  createSimulationConfig,
  getAcValidationError,
  getDcSweepValidationError,
  getSimulationConfigValidationError,
  getSimulationAnalysisLabel,
  getSimulationModeLabel,
} from "./simulationConfig.js";

const targets = [
  { id: "V1-id", label: "Supply", componentType: "Voltage Source", parameters: [{ parameter: "V", label: "Voltage", unit: "V" }] },
  { id: "I1-id", label: "Current", componentType: "Current Source", parameters: [{ parameter: "I", label: "Current", unit: "A" }] },
  { id: "R1-id", label: "Load", componentType: "Resistor", parameters: [{ parameter: "R", label: "Resistance", unit: "Ω" }] },
];

test("simulation defaults to static execution", () => {
  const config = createSimulationConfig();
  assert.equal(config.mode, SIMULATION_MODES.STATIC);
  assert.equal(getSimulationModeLabel(config.mode), "Static");
  assert.equal(getSimulationConfigValidationError(config, []), null);
});

test("live mode supports DC operating point", () => {
  const config = createSimulationConfig({ mode: SIMULATION_MODES.LIVE, analysis: SIMULATION_ANALYSES.DC_OPERATING_POINT });
  assert.equal(getSimulationConfigValidationError(config, []), null);
});

test("live mode supports AC analysis", () => {
  const config = createSimulationConfig({ mode: SIMULATION_MODES.LIVE, analysis: SIMULATION_ANALYSES.AC, settings: DEFAULT_AC_SETTINGS });
  assert.equal(getSimulationConfigValidationError(config, []), null);
  assert.equal(getSimulationAnalysisLabel(config.analysis), "AC Analysis");
});

test("live mode rejects transient until a live transient runtime exists", () => {
  const config = createSimulationConfig({ mode: SIMULATION_MODES.LIVE, analysis: SIMULATION_ANALYSES.TRANSIENT });
  assert.equal(getSimulationConfigValidationError(config, []), "Live mode currently supports DC Operating Point and AC Analysis.");
});

test("AC settings validate frequency and amplitude", () => {
  assert.equal(getAcValidationError(DEFAULT_AC_SETTINGS), null);
  assert.equal(getAcValidationError({ ...DEFAULT_AC_SETTINGS, frequency: 0 }), "AC frequency must be greater than zero.");
  assert.equal(getAcValidationError({ ...DEFAULT_AC_SETTINGS, amplitude: -1 }), "AC amplitude must not be negative.");
});

test("parameter sweep is a supported analysis", () => {
  const config = createSimulationConfig({ analysis: SIMULATION_ANALYSES.DC_SWEEP, settings: { ...DEFAULT_DC_SWEEP_SETTINGS, source: "V1-id", parameter: "V" } });
  assert.equal(config.analysis, "dc_sweep");
  assert.equal(getSimulationAnalysisLabel(config.analysis), "Parameter Sweep");
  assert.equal(getSimulationConfigValidationError(config, targets), null);
});

test("parameter sweep accepts current-source target", () => {
  assert.equal(getDcSweepValidationError({ ...DEFAULT_DC_SWEEP_SETTINGS, source: "I1-id", parameter: "I", start: 0, stop: 0.1, step: 0.05 }, targets), null);
});

test("parameter sweep accepts component-parameter target", () => {
  assert.equal(getDcSweepValidationError({ ...DEFAULT_DC_SWEEP_SETTINGS, source: "R1-id", parameter: "R", start: 50, stop: 150, step: 50 }, targets), null);
});

test("parameter sweep rejects an unavailable parameter", () => {
  assert.equal(getDcSweepValidationError({ ...DEFAULT_DC_SWEEP_SETTINGS, source: "V1-id", parameter: "I", start: 0, stop: 10, step: 1 }, targets), "The selected sweep parameter is no longer available.");
});

test("parameter sweep rejects a missing target", () => {
  assert.equal(getDcSweepValidationError({ start: 0, stop: 10, step: 1 }, []), "Select a component or source parameter to sweep.");
});

test("parameter sweep rejects an unavailable target", () => {
  assert.equal(getDcSweepValidationError({ source: "V2", parameter: "V", start: 0, stop: 10, step: 1 }, targets), "The selected sweep target is no longer available.");
});

test("parameter sweep validates step direction and zero step", () => {
  assert.equal(getDcSweepValidationError({ source: "V1-id", parameter: "V", start: 0, stop: 10, step: 0 }, targets), "Step cannot be zero.");
  assert.equal(getDcSweepValidationError({ source: "V1-id", parameter: "V", start: 0, stop: 10, step: -1 }, targets), "Step must be positive when start is below stop.");
  assert.equal(getDcSweepValidationError({ source: "V1-id", parameter: "V", start: 10, stop: 0, step: 1 }, targets), "Step must be negative when start is above stop.");
});

test("operating point keeps the existing default configuration", () => {
  const config = createSimulationConfig();
  assert.equal(config.analysis, SIMULATION_ANALYSES.DC_OPERATING_POINT);
  assert.deepEqual(config.settings, {});
  assert.equal(getSimulationConfigValidationError(config, []), null);
});
