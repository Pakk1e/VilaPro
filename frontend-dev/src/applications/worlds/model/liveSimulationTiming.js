export function getLiveSimulationRate({ analysis, frequency, previousTime, previousWallTime, currentTime, currentWallTime }) {
  if (Number.isFinite(previousTime) && Number.isFinite(previousWallTime) && Number.isFinite(currentTime) && Number.isFinite(currentWallTime)) {
    const wallDelta = (currentWallTime - previousWallTime) / 1000;
    const simulationDelta = currentTime - previousTime;
    if (wallDelta > 0 && Number.isFinite(simulationDelta) && simulationDelta >= 0) {
      return simulationDelta / wallDelta;
    }
  }

  if (analysis === "ac" && Number.isFinite(frequency) && frequency > 0) {
    return 1 / frequency;
  }

  return 1;
}

export function interpolateLiveSimulationTime({ anchorTime, anchorWallTime, wallTime, rate }) {
  if (![anchorTime, anchorWallTime, wallTime, rate].every(Number.isFinite) || rate < 0) return anchorTime;
  return anchorTime + ((wallTime - anchorWallTime) / 1000) * rate;
}
