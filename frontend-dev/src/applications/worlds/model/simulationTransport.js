function requireObject(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Simulation transport ${path} must be an object`);
  }
  return value;
}

function requireNonEmptyString(value, path) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Simulation transport ${path} must be a non-empty string`);
  }
}

function requireFiniteNumber(value, path) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Simulation transport ${path} must be a finite number`);
  }
}

export function validateSimulationRequest(request) {
  const payload = requireObject(request, "request");
  requireNonEmptyString(payload.world_source, "world_source");
  if (!Array.isArray(payload.instances)) {
    throw new Error("Simulation transport instances must be an array");
  }
  const simulation = requireObject(payload.simulation, "simulation");
  requireNonEmptyString(simulation.mode, "simulation.mode");
  requireNonEmptyString(simulation.analysis, "simulation.analysis");
  if (!simulation.settings || typeof simulation.settings !== "object" || Array.isArray(simulation.settings)) {
    throw new Error("Simulation transport simulation.settings must be an object");
  }
  if (!Array.isArray(simulation.outputs)) {
    throw new Error("Simulation transport simulation.outputs must be an array");
  }
  return true;
}

export function validateSimulationResponse(data) {
  const payload = requireObject(data, "response");
  if (payload.ok !== true) throw new Error("Simulation transport response is not successful");
  requireNonEmptyString(payload.analysis, "analysis");
  requireNonEmptyString(payload.status, "status");
  if (!payload.node_voltages || typeof payload.node_voltages !== "object" || Array.isArray(payload.node_voltages)) {
    throw new Error("Simulation transport node_voltages must be an object");
  }
  if (!payload.branch_currents || typeof payload.branch_currents !== "object" || Array.isArray(payload.branch_currents)) {
    throw new Error("Simulation transport branch_currents must be an object");
  }
  if (!Array.isArray(payload.components)) {
    throw new Error("Simulation transport components must be an array");
  }
  requireObject(payload.result, "result");
  if (payload.visualization !== null && payload.visualization !== undefined) requireObject(payload.visualization, "visualization");
  return true;
}

export function validateLiveSnapshot(data) {
  const payload = requireObject(data, "live response");
  if (payload.ok !== true) throw new Error("Simulation transport live response is not successful");
  requireNonEmptyString(payload.session_id, "session_id");
  requireNonEmptyString(payload.analysis, "analysis");
  requireNonEmptyString(payload.mode, "mode");
  requireNonEmptyString(payload.status, "status");
  if (payload.independent_value !== null && payload.independent_value !== undefined) requireFiniteNumber(payload.independent_value, "independent_value");
  if (!payload.signals || typeof payload.signals !== "object" || Array.isArray(payload.signals)) {
    throw new Error("Simulation transport signals must be an object");
  }
  if (payload.error !== null && payload.error !== undefined) requireNonEmptyString(payload.error, "error");
  return true;
}

export function buildSimulationRequest(nodes, edges, simulationConfig, serializeWorldGraph) {
  const request = {
    ...serializeWorldGraph(nodes, edges),
    simulation: simulationConfig,
  };
  validateSimulationRequest(request);
  return request;
}

export function buildLiveSimulationRequest(nodes, edges, simulationConfig, serializeWorldGraph) {
  const request = {
    ...serializeWorldGraph(nodes, edges),
    simulation: {
      ...simulationConfig,
      mode: "live",
    },
  };
  validateSimulationRequest(request);
  return request;
}

export function normalizeSimulationResponse(data) {
  validateSimulationResponse(data);
  const components = Array.isArray(data.components)
    ? Object.fromEntries(data.components.map((component) => [component.id, component]))
    : data.components ?? {};

  return { ...data, components };
}

export function normalizeLiveSnapshot(data) {
  validateLiveSnapshot(data);
  return {
    ...data,
    signals: { ...data.signals },
  };
}
