export function buildSimulationRequest(nodes, edges, simulationConfig, serializeWorldGraph) {
  return {
    ...serializeWorldGraph(nodes, edges),
    simulation: simulationConfig,
  };
}

export function normalizeSimulationResponse(data) {
  const components = Array.isArray(data.components)
    ? Object.fromEntries(data.components.map((component) => [component.id, component]))
    : data.components ?? {};

  return { ...data, components };
}
