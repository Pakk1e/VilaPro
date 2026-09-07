const ELECTRONICS_WORLD_SOURCE = `
world Electronics {

    port_type ElectricalNode;

    quantity Current {
        dimension: I;
        unit: A;
    }

    quantity Power {
        dimension: M * L^2 / T^3;
        unit: W;
    }

    quantity Voltage {
        dimension: Power / Current;
        unit: V;
    }

    quantity Resistance {
        dimension: Voltage / Current;
        unit: Ohm;
    }

    component Resistor {
        parameter R : Resistance;
        interface {
            p : ElectricalNode;
            n : ElectricalNode;
        }
        representation ideal {
            equation:
                voltage(p, n) = current(p, n) * R;
        }
    }

    component VoltageSource {
        parameter V : Voltage;
        interface {
            p : ElectricalNode;
            n : ElectricalNode;
        }
        representation ideal {
            equation:
                voltage(p, n) = V;
        }
    }

    component CurrentSource {
        parameter I : Current;
        interface {
            p : ElectricalNode;
            n : ElectricalNode;
        }
        representation ideal {
            equation:
                current(p, n) = I;
        }
    }
}
`;

const PROPERTY_TO_PARAMETER = {
  Resistor: {
    backendType: "Resistor",
    parameter: { resistance: "R" },
  },
  "Voltage Source": {
    backendType: "VoltageSource",
    parameter: { voltage: "V" },
  },
  "Current Source": {
    backendType: "CurrentSource",
    parameter: { current: "I" },
  },
};

function endpointKey(nodeId, handleId) {
  return `${nodeId}::${handleId}`;
}

class DisjointSet {
  constructor() {
    this.parent = new Map();
  }

  add(value) {
    if (!this.parent.has(value)) this.parent.set(value, value);
  }

  find(value) {
    this.add(value);
    let current = value;
    while (this.parent.get(current) !== current) {
      current = this.parent.get(current);
    }
    const root = current;
    current = value;
    while (this.parent.get(current) !== current) {
      const next = this.parent.get(current);
      this.parent.set(current, root);
      current = next;
    }
    return root;
  }

  union(first, second) {
    const firstRoot = this.find(first);
    const secondRoot = this.find(second);
    if (firstRoot !== secondRoot) this.parent.set(secondRoot, firstRoot);
  }
}

function getComponentPorts(node) {
  return node.data?.ports ?? [];
}

function getBackendType(node) {
  const componentType = node.data?.componentType;
  if (!componentType) {
    throw new Error(`Node "${node.id}" has no component type`);
  }

  const definition = PROPERTY_TO_PARAMETER[componentType];
  if (!definition) {
    throw new Error(
      `Component "${componentType}" is not yet supported by the simulation bridge`
    );
  }
  return definition.backendType;
}

function validateGraph(nodes, edges) {
  const groundNodes = nodes.filter(
    (node) => node.data?.componentType === "Ground"
  );

  if (groundNodes.length === 0) {
    throw new Error("Ground is required before the circuit can be simulated.");
  }

  if (groundNodes.length > 1) {
    throw new Error("The circuit must contain only one Ground component.");
  }

  const validEndpoints = new Set();
  const connectedEndpoints = new Set();

  for (const node of nodes) {
    if (node.type === "junction") {
      for (const handle of [
        "junction-top",
        "junction-right",
        "junction-bottom",
        "junction-left",
      ]) {
        validEndpoints.add(endpointKey(node.id, handle));
      }
      continue;
    }

    for (const port of getComponentPorts(node)) {
      validEndpoints.add(endpointKey(node.id, port.id));
    }
  }

  for (const edge of edges) {
    if (!edge.source || !edge.target || !edge.sourceHandle || !edge.targetHandle) {
      throw new Error("Circuit contains an invalid wire endpoint.");
    }

    const source = endpointKey(edge.source, edge.sourceHandle);
    const target = endpointKey(edge.target, edge.targetHandle);

    if (!validEndpoints.has(source) || !validEndpoints.has(target)) {
      throw new Error("Circuit contains a wire connected to an invalid terminal.");
    }

    connectedEndpoints.add(source);
    connectedEndpoints.add(target);
  }

  for (const node of nodes) {
    if (node.type !== "world") continue;

    for (const port of getComponentPorts(node)) {
      const endpoint = endpointKey(node.id, port.id);
      if (!connectedEndpoints.has(endpoint)) {
        const label = node.data?.label ?? node.id;
        throw new Error(
          `${label}: terminal "${port.label ?? port.id}" is unconnected.`
        );
      }
    }
  }
}

function buildConnectivity(nodes, edges) {
  const dsu = new DisjointSet();

  for (const node of nodes) {
    if (node.type === "junction") {
      for (const handle of [
        "junction-top",
        "junction-right",
        "junction-bottom",
        "junction-left",
      ]) {
        dsu.add(endpointKey(node.id, handle));
      }
    } else {
      for (const port of getComponentPorts(node)) {
        dsu.add(endpointKey(node.id, port.id));
      }
    }
  }

  dsu.add("ground");

  for (const edge of edges) {
    dsu.union(
      endpointKey(edge.source, edge.sourceHandle),
      endpointKey(edge.target, edge.targetHandle)
    );
  }

  const junctionHandles = [
    "junction-top",
    "junction-right",
    "junction-bottom",
    "junction-left",
  ];

  for (const node of nodes) {
    if (node.type !== "junction") continue;
    const first = endpointKey(node.id, junctionHandles[0]);
    for (const handle of junctionHandles.slice(1)) {
      dsu.union(first, endpointKey(node.id, handle));
    }
  }

  for (const node of nodes) {
    if (node.data?.componentType !== "Ground") continue;
    dsu.union(endpointKey(node.id, "g"), "ground");
  }

  return dsu;
}

function buildNetNames(nodes, dsu) {
  const roots = new Map();
  for (const node of nodes) {
    if (node.type === "junction") continue;
    for (const port of getComponentPorts(node)) {
      const root = dsu.find(endpointKey(node.id, port.id));
      if (!roots.has(root)) roots.set(root, `node_${roots.size + 1}`);
    }
  }
  return roots;
}

function getPortNet(node, portId, dsu, netNames) {
  const root = dsu.find(endpointKey(node.id, portId));
  if (root === dsu.find("ground")) return "ground";

  const net = netNames.get(root);
  if (!net) {
    throw new Error(`Unable to resolve electrical net for ${node.data?.label ?? node.id}:${portId}`);
  }
  return net;
}

function buildInstance(node, dsu, netNames) {
  const backendType = getBackendType(node);
  const componentType = node.data?.componentType;
  const definition = PROPERTY_TO_PARAMETER[componentType];
  const properties = node.data?.properties ?? {};
  const parameters = {};

  for (const [propertyName, parameterName] of Object.entries(definition.parameter)) {
    const value = properties[propertyName];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        `${node.data?.label ?? node.id}: property "${propertyName}" must be a finite number`
      );
    }
    if (value <= 0) {
      throw new Error(
        `${node.data?.label ?? node.id}: property "${propertyName}" must be greater than zero`
      );
    }
    parameters[parameterName] = value;
  }

  const ports = {};
  for (const port of getComponentPorts(node)) {
    ports[port.id] = getPortNet(node, port.id, dsu, netNames);
  }

  return {
    id: node.id,
    name: node.data?.label ?? node.id,
    type: backendType,
    parameters,
    ports,
  };
}

export function buildCircuitDescription(nodes, edges) {
  const componentNodes = nodes.filter(
    (node) => node.type === "world" && node.data?.componentType !== "Ground"
  );

  if (componentNodes.length === 0) {
    throw new Error("Add at least one simulation component.");
  }

  validateGraph(nodes, edges);

  const dsu = buildConnectivity(nodes, edges);
  const netNames = buildNetNames(nodes, dsu);

  return {
    instances: componentNodes.map((node) =>
      buildInstance(node, dsu, netNames)
    ),
  };
}

export function serializeWorldGraph(nodes, edges) {
  const description = buildCircuitDescription(nodes, edges);

  return {
    world_source: ELECTRONICS_WORLD_SOURCE.trim(),
    instances: description.instances,
  };
}
