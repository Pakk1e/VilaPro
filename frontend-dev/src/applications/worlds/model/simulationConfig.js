export const SIMULATION_ANALYSES = {
  DC_OPERATING_POINT: "dc_operating_point",
  DC_SWEEP: "dc_sweep",
};

export const DEFAULT_SIMULATION_CONFIG = {
  analysis: SIMULATION_ANALYSES.DC_OPERATING_POINT,
  settings: {},
  outputs: [],
};

export const DEFAULT_DC_SWEEP_SETTINGS = {
  source: "",
  start: 0,
  stop: 10,
  step: 1,
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

export function getSimulationAnalysisLabel(analysis) {
  switch (analysis) {
    case SIMULATION_ANALYSES.DC_OPERATING_POINT:
      return "DC Operating Point";
    case SIMULATION_ANALYSES.DC_SWEEP:
      return "DC Sweep";
    default:
      return "Unknown analysis";
  }
}

export function getDcSweepValidationError(settings, voltageSourceIds = []) {
  const source = settings?.source ?? "";
  if (!source) return "Select a voltage source to sweep.";
  if (!voltageSourceIds.includes(source)) return "The selected sweep source is no longer available.";

  const start = Number(settings?.start);
  const stop = Number(settings?.stop);
  const step = Number(settings?.step);

  if (![start, stop, step].every(Number.isFinite)) {
    return "Start, stop and step must be finite numbers.";
  }
  if (step === 0) return "Step cannot be zero.";
  if (start < stop && step < 0) return "Step must be positive when start is below stop.";
  if (start > stop && step > 0) return "Step must be negative when start is above stop.";
  if (start === stop) return "Start and stop must be different.";

  return null;
}

export function getSimulationConfigValidationError(config, voltageSourceIds = []) {
  if (!config || !Object.values(SIMULATION_ANALYSES).includes(config.analysis)) {
    return "Select a supported simulation analysis.";
  }

  if (config.analysis === SIMULATION_ANALYSES.DC_SWEEP) {
    return getDcSweepValidationError(config.settings, voltageSourceIds);
  }

  return null;
}
