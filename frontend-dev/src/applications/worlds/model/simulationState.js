export const SIMULATION_STATUS = {
  READY: "ready",
  RUNNING: "running",
  CURRENT: "current",
  STALE: "stale",
  ERROR: "error",
};

export function getSimulationStatus({
  result,
  running,
  error,
  simulationIsStale,
}) {
  if (running) return SIMULATION_STATUS.RUNNING;
  if (error) return SIMULATION_STATUS.ERROR;
  if (simulationIsStale) return SIMULATION_STATUS.STALE;
  if (result) return SIMULATION_STATUS.CURRENT;
  return SIMULATION_STATUS.READY;
}

export function getSimulationStatusLabel(status) {
  switch (status) {
    case SIMULATION_STATUS.RUNNING:
      return "Running";
    case SIMULATION_STATUS.CURRENT:
      return "Up to date";
    case SIMULATION_STATUS.STALE:
      return "Out of date";
    case SIMULATION_STATUS.ERROR:
      return "Simulation error";
    default:
      return "Not simulated";
  }
}
