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
}
`;

const PROPERTY_TO_PARAMETER = {
  Resistor: {
    backendType: "Resistor",
    parameter: {
      resistance: "R",
    },
  },

  "Voltage Source": {
    backendType: "VoltageSource",
    parameter: {
      voltage: "V",
    },
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
    if (!this.parent.has(value)) {
      this.parent.set(value, value);
    }
  }

  find(value) {
    this.add(value);

    let current = value;

    while (this.parent.get(current) !== current) {
      current = this.parent.get(current);
    }

    let root = current;
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

    if (firstRoot !== secondRoot) {
      this.parent.set(secondRoot, firstRoot);
    }
  }
}

function getComponentPorts(node) {
  return node.data?.ports ?? [];
}

function getBackendType(node) {
  const componentType = node.data?.componentType;

  if (!componentType) {
    throw new Error(
      `Node "${node.id}" has no component type`
    );
  }

  const definition = PROPERTY_TO_PARAMETER[componentType];

  if (!definition) {
    throw new Error(
      `Component "${componentType}" is not yet supported by the simulation bridge`
    );
  }

  return definition.backendType;
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

      dsu.add(`ground`);
    } else {
      for (const port of getComponentPorts(node)) {
        dsu.add(endpointKey(node.id, port.id));
      }
    }
  }

  for (const edge of edges) {
    if (!edge.source || !edge.target) {
      continue;
    }

    if (!edge.sourceHandle || !edge.targetHandle) {
      continue;
    }

    dsu.union(
      endpointKey(edge.source, edge.sourceHandle),
      endpointKey(edge.target, edge.targetHandle)
    );
  }

  // Every handle on a junction is electrically identical.
  for (const node of nodes) {
    if (node.type !== "junction") {
      continue;
    }

    const handles = [
      "junction-top",
      "junction-right",
      "junction-bottom",
      "junction-left",
    ];

    const first = endpointKey(node.id, handles[0]);

    for (const handle of handles.slice(1)) {
      dsu.union(
        first,
        endpointKey(node.id, handle)
      );
    }
  }

  // Ground is a special zero-potential network node.
  for (const node of nodes) {
    if (node.data?.componentType !== "Ground") {
      continue;
    }

    const groundPort = endpointKey(node.id, "g");

    dsu.union(groundPort, "ground");
  }

  return dsu;
}

function buildNetNames(nodes, dsu) {
  const roots = new Map();

  for (const node of nodes) {
    if (node.type === "junction") {
      continue;
    }

    for (const port of getComponentPorts(node)) {
      const endpoint = endpointKey(node.id, port.id);
      const root = dsu.find(endpoint);

      if (!roots.has(root)) {
        roots.set(root, `node_${roots.size + 1}`);
      }
    }
  }

  return roots;
}

function getPortNet(node, portId, dsu, netNames) {
  const endpoint = endpointKey(node.id, portId);

  const root = dsu.find(endpoint);

  if (root === dsu.find("ground")) {
    return "ground";
  }

  const net = netNames.get(root);

  if (!net) {
    throw new Error(
      `Unable to resolve electrical net for ${node.id}:${portId}`
    );
  }

  return net;
}

function buildInstance(node, dsu, netNames) {
  const backendType = getBackendType(node);

  const componentType =
    node.data?.componentType;

  const definition =
    PROPERTY_TO_PARAMETER[componentType];

  const parameterMap =
    definition?.parameter ?? {};

  const properties =
    node.data?.properties ?? {};

  const parameters = {};

  for (const [propertyName, parameterName] of Object.entries(
    parameterMap
  )) {
    const value = properties[propertyName];

    if (
      typeof value !== "number" ||
      !Number.isFinite(value)
    ) {
      throw new Error(
        `${node.data?.label ?? node.id}: property "${propertyName}" must be a finite number`
      );
    }

    parameters[parameterName] = value;
  }

  const ports = {};

  for (const port of getComponentPorts(node)) {
    ports[port.id] = getPortNet(
      node,
      port.id,
      dsu,
      netNames
    );
  }

  return {
    type: backendType,
    parameters,
    ports,
  };
}

export function serializeWorldGraph(
  nodes,
  edges
) {
  const componentNodes = nodes.filter(
    (node) =>
      node.type === "world" &&
      node.data?.componentType !== "Ground"
  );

  if (componentNodes.length === 0) {
    throw new Error(
      "Add at least one simulation component."
    );
  }

  const dsu = buildConnectivity(
    nodes,
    edges
  );

  const netNames = buildNetNames(
    nodes,
    dsu
  );

  const instances = componentNodes.map(
    (node) =>
      buildInstance(
        node,
        dsu,
        netNames
      )
  );

  return {
    world_source: ELECTRONICS_WORLD_SOURCE.trim(),
    instances,
  };
}
