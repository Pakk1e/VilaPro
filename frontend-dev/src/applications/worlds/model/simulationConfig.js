export const SIMULATION_ANALYSES = {
  DC_OPERATING_POINT: "dc_operating_point",
};

export const DEFAULT_SIMULATION_CONFIG = {
  analysis: SIMULATION_ANALYSES.DC_OPERATING_POINT,
  settings: {},
  outputs: [],
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
    default:
      return "Unknown analysis";
  }
}
