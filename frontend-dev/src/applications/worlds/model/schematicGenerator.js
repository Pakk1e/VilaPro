const NET_LAYOUT = {
  left: 80,
  right: 680,
  top: 70,
  bottom: 550,
};

const COMPONENT_SPACING = 180;
const BRANCH_SPACING = 130;
const GROUND_Y = 500;

function getComponentPorts(instance) {
  return instance.ports ?? {};
}

function buildNetGraph(description) {
  const nets = new Map();

  for (const instance of description.instances ?? []) {
    for (const [portId, netName] of Object.entries(getComponentPorts(instance))) {
      if (!nets.has(netName)) nets.set(netName, []);
      nets.get(netName).push({ instance, portId });
    }
  }

  return nets;
}

function classifyInstance(instance) {
  if (instance.type === "VoltageSource") return "voltage-source";
  if (instance.type === "Resistor") return "resistor";
  return "generic";
}

function chooseReferenceSource(instances) {
  return instances.find((instance) => instance.type === "VoltageSource") ?? instances[0] ?? null;
}

function chooseGroundNet(description) {
  const instances = description.instances ?? [];
  const nets = buildNetGraph(description);
  const source = chooseReferenceSource(instances);
  if (!source) return "ground";

  const sourcePorts = getComponentPorts(source);
  if (sourcePorts.n === "ground") return "ground";
  if (sourcePorts.p === "ground") return "ground";

  const groundCandidates = [...nets.entries()].filter(([, endpoints]) =>
    endpoints.some(({ instance, portId }) => instance.type === "VoltageSource" && portId === "n")
  );

  return groundCandidates[0]?.[0] ?? "ground";
}

function connectedComponentsForNet(netName, nets) {
  return (nets.get(netName) ?? []).map(({ instance, portId }) => ({
    instance,
    portId,
  }));
}

function assignSeriesBranchLayout(description) {
  const instances = description.instances ?? [];
  const nets = buildNetGraph(description);
  const groundNet = chooseGroundNet(description);
  const source = chooseReferenceSource(instances);
  const positions = new Map();

  if (!source) return { positions, nets, groundNet };

  const sourcePorts = getComponentPorts(source);
  const sourcePositiveNet = sourcePorts.p;
  const sourceNegativeNet = sourcePorts.n;

  positions.set(source.id, { x: 150, y: 270 });

  const visited = new Set([source.id]);
  let currentNet = sourcePositiveNet;
  let x = 330;
  let branchIndex = 0;

  while (currentNet && currentNet !== groundNet && branchIndex < instances.length + 2) {
    const candidates = connectedComponentsForNet(currentNet, nets)
      .map(({ instance, portId }) => ({ instance, portId }))
      .filter(({ instance }) => !visited.has(instance.id));

    if (candidates.length === 0) break;

    const next = candidates[0].instance;
    visited.add(next.id);
    positions.set(next.id, { x, y: 270 });

    const ports = getComponentPorts(next);
    const nextNet = Object.entries(ports).find(([, netName]) => netName !== currentNet)?.[1];
    currentNet = nextNet;
    x += COMPONENT_SPACING;
    branchIndex += 1;
  }

  // Any remaining components belong to side branches. Place them in rows
  // around the first connected net rather than using editor coordinates.
  const remaining = instances.filter((instance) => !positions.has(instance.id));
  remaining.forEach((instance, index) => {
    const y = 180 + (index % 3) * BRANCH_SPACING;
    const xOffset = 300 + Math.floor(index / 3) * COMPONENT_SPACING;
    positions.set(instance.id, { x: xOffset, y });
  });

  if (sourceNegativeNet && sourceNegativeNet !== groundNet) {
    const negativeEndpoints = connectedComponentsForNet(sourceNegativeNet, nets);
    negativeEndpoints.forEach(({ instance }) => {
      if (!positions.has(instance.id)) return;
      positions.set(instance.id, { ...positions.get(instance.id), y: 380 });
    });
  }

  return { positions, nets, groundNet };
}

function getBounds(instances, positions) {
  const points = instances
    .map((instance) => positions.get(instance.id))
    .filter(Boolean);

  if (points.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };

  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

export function generateSchematic(description) {
  const instances = description.instances ?? [];
  const { positions, nets, groundNet } = assignSeriesBranchLayout(description);

  return {
    instances,
    positions,
    nets,
    groundNet,
    bounds: getBounds(instances, positions),
    layout: {
      width: NET_LAYOUT.right - NET_LAYOUT.left,
      height: NET_LAYOUT.bottom - NET_LAYOUT.top,
    },
  };
}

export function getSchematicPort(instance, portId, position) {
  const kind = classifyInstance(instance);
  const ports = getComponentPorts(instance);

  if (kind === "voltage-source" || kind === "resistor") {
    const netName = ports[portId];
    const horizontalPort = portId === "p" || portId === "n";
    if (horizontalPort) {
      const sign = portId === "p" ? -1 : 1;
      return { x: position.x + sign * 60, y: position.y };
    }
    return { x: position.x, y: position.y + 60 };
  }

  return { x: position.x, y: position.y };
}

export function getGroundPosition(layout) {
  return {
    x: (layout.left + layout.right) / 2,
    y: GROUND_Y,
  };
}
