export const SIMULATION_MODES = {
  STATIC: "static",
  LIVE: "live",
};

export const SIMULATION_ANALYSES = {
  DC_OPERATING_POINT: "dc_operating_point",
  DC_SWEEP: "dc_sweep",
  TRANSIENT: "transient",
  AC: "ac",
};

export const DEFAULT_SIMULATION_CONFIG = {
  mode: SIMULATION_MODES.STATIC,
  analysis: SIMULATION_ANALYSES.DC_OPERATING_POINT,
  settings: {},
  outputs: [],
};

export const DEFAULT_DC_SWEEP_SETTINGS = {
  source: "",
  parameter: "",
  start: 0,
  stop: 10,
  step: 1,
};

export const DEFAULT_TRANSIENT_SETTINGS = {
  start: 0,
  stop: 1,
  step: 0.001,
};

export const DEFAULT_AC_SETTINGS = {
  frequency: 1000,
  amplitude: 1,
  phase: 0,
};

export function createSimulationConfig(overrides = {}) {
  return {
    ...DEFAULT_SIMULATION_CONFIG,
    ...overrides,
    settings: {
      ...DEFAULT_SIMULATION_CONFIG.settings,
      ...(overrides.settings ?? {}),
    },
    outputs: [...(overrides.outputs ?? DEFAULT_SIMULATION_CONFIG.outputs)],
  };
}

export function getSimulationModeLabel(mode) {
  switch (mode) {
    case SIMULATION_MODES.STATIC: return "Static";
    case SIMULATION_MODES.LIVE: return "Live";
    default: return "Unknown mode";
  }
}

export function getSimulationAnalysisLabel(analysis) {
  switch (analysis) {
    case SIMULATION_ANALYSES.DC_OPERATING_POINT: return "DC Operating Point";
    case SIMULATION_ANALYSES.DC_SWEEP: return "Parameter Sweep";
    case SIMULATION_ANALYSES.TRANSIENT: return "Transient";
    case SIMULATION_ANALYSES.AC: return "AC Analysis";
    default: return "Unknown analysis";
  }
}

function normalizeSweepTargets(sweepTargets = []) {
  return sweepTargets.map((target) => (typeof target === "string" ? { id: target, parameters: [], legacy: true } : target));
}

export function getDcSweepValidationError(settings, sweepTargets = []) {
  const source = settings?.source ?? "";
  const targets = normalizeSweepTargets(sweepTargets);
  const target = targets.find((item) => item.id === source);
  const legacyTargets = targets.some((item) => item.legacy);
  if (!source) return legacyTargets ? "Select a sweep target." : "Select a component or source parameter to sweep.";
  if (!target) return "The selected sweep target is no longer available.";
  const parameter = settings?.parameter ?? target.parameters?.[0]?.parameter ?? (target.legacy ? "" : "");
  if (!parameter) return "The selected sweep target has no sweep parameter.";
  if (Array.isArray(target.parameters) && target.parameters.length > 0 && !target.parameters.some((item) => (typeof item === "string" ? item : item.parameter) === parameter)) return "The selected sweep parameter is no longer available.";
  const start = Number(settings?.start), stop = Number(settings?.stop), step = Number(settings?.step);
  if (![start, stop, step].every(Number.isFinite)) return "Start, stop and step must be finite numbers.";
  if (step === 0) return "Step cannot be zero.";
  if (start < stop && step < 0) return "Step must be positive when start is below stop.";
  if (start > stop && step > 0) return "Step must be negative when start is above stop.";
  if (start === stop) return "Start and stop must be different.";
  return null;
}

export function getTransientValidationError(settings) {
  const start = Number(settings?.start), stop = Number(settings?.stop), step = Number(settings?.step);
  if (![start, stop, step].every(Number.isFinite)) return "Start, stop and step must be finite numbers.";
  if (step <= 0) return "Transient step must be greater than zero.";
  if (stop <= start) return "Transient stop time must be greater than start time.";
  const points = Math.floor((stop - start) / step + 1e-12) + 1;
  if (points > 10000) return "Transient configuration exceeds the 10,000 time-point limit.";
  return null;
}

export function getAcValidationError(settings) {
  const frequency = Number(settings?.frequency), amplitude = Number(settings?.amplitude), phase = Number(settings?.phase);
  if (![frequency, amplitude, phase].every(Number.isFinite)) return "Frequency, amplitude and phase must be finite numbers.";
  if (frequency <= 0) return "AC frequency must be greater than zero.";
  if (amplitude < 0) return "AC amplitude must not be negative.";
  return null;
}

export function getSimulationConfigValidationError(config, sweepTargets = []) {
  if (!config || !Object.values(SIMULATION_MODES).includes(config.mode)) return "Select a supported simulation mode.";
  if (!Object.values(SIMULATION_ANALYSES).includes(config.analysis)) return "Select a supported simulation analysis.";
  if (config.mode === SIMULATION_MODES.LIVE && ![SIMULATION_ANALYSES.DC_OPERATING_POINT, SIMULATION_ANALYSES.AC].includes(config.analysis)) return "Live mode currently supports DC Operating Point and AC Analysis.";
  if (config.analysis === SIMULATION_ANALYSES.DC_SWEEP) return getDcSweepValidationError(config.settings, sweepTargets);
  if (config.analysis === SIMULATION_ANALYSES.TRANSIENT) return getTransientValidationError(config.settings);
  if (config.analysis === SIMULATION_ANALYSES.AC) return getAcValidationError(config.settings);
  return null;
}
