export function buildSimulationRequest(nodes, edges, simulationConfig, serializeWorldGraph) {
  return {
    ...serializeWorldGraph(nodes, edges),
    simulation: simulationConfig,
  };
}

export function buildLiveSimulationRequest(nodes, edges, simulationConfig, serializeWorldGraph) {
  return {
    ...serializeWorldGraph(nodes, edges),
    simulation: {
      ...simulationConfig,
      mode: "live",
    },
  };
}

export function normalizeSimulationResponse(data) {
  const components = Array.isArray(data.components)
    ? Object.fromEntries(data.components.map((component) => [component.id, component]))
    : data.components ?? {};

  return { ...data, components };
}

export function normalizeLiveSnapshot(data) {
  return {
    ...data,
    signals: data?.signals && typeof data.signals === "object" ? { ...data.signals } : {},
  };
}
