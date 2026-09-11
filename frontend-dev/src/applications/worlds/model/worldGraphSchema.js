const NODE_TYPES = new Set(["world", "junction"]);
const JUNCTION_HANDLES = new Set(["junction-top", "junction-right", "junction-bottom", "junction-left"]);

function fail(path, message) {
  throw new Error(`WorldGraph ${path}: ${message}`);
}

function requireArray(value, path) {
  if (!Array.isArray(value)) fail(path, "must be an array");
  return value;
}

function requireNonEmptyString(value, path) {
  if (typeof value !== "string" || value.length === 0) fail(path, "must be a non-empty string");
}

function validatePosition(position, path) {
  if (!position || typeof position !== "object") fail(path, "must be an object");
  for (const axis of ["x", "y"]) {
    if (typeof position[axis] !== "number" || !Number.isFinite(position[axis])) {
      fail(`${path}.${axis}`, "must be a finite number");
    }
  }
}

function validatePorts(node, path) {
  const ports = requireArray(node.data?.ports, `${path}.data.ports`);
  const ids = new Set();
  for (let index = 0; index < ports.length; index += 1) {
    const port = ports[index];
    const portPath = `${path}.data.ports[${index}]`;
    if (!port || typeof port !== "object") fail(portPath, "must be an object");
    requireNonEmptyString(port.id, `${portPath}.id`);
    if (ids.has(port.id)) fail(`${path}.data.ports`, `contains duplicate port id "${port.id}"`);
    ids.add(port.id);
    if (typeof port.kind !== "string" || port.kind.length === 0) fail(`${portPath}.kind`, "must be a non-empty string");
    if (typeof port.position !== "string" || port.position.length === 0) fail(`${portPath}.position`, "must be a non-empty string");
  }
  return ids;
}

export function validateWorldGraphSchema(nodes, edges) {
  requireArray(nodes, "nodes");
  requireArray(edges, "edges");

  const nodeIds = new Set();
  const handlesByNode = new Map();

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const path = `nodes[${index}]`;
    if (!node || typeof node !== "object") fail(path, "must be an object");
    requireNonEmptyString(node.id, `${path}.id`);
    if (nodeIds.has(node.id)) fail(`${path}.id`, `duplicates node id "${node.id}"`);
    nodeIds.add(node.id);

    if (!NODE_TYPES.has(node.type)) fail(`${path}.type`, `unsupported node type "${node.type}"`);
    validatePosition(node.position, `${path}.position`);

    if (node.type === "junction") {
      handlesByNode.set(node.id, JUNCTION_HANDLES);
      continue;
    }

    if (!node.data || typeof node.data !== "object") fail(`${path}.data`, "must be an object");
    requireNonEmptyString(node.data.componentType, `${path}.data.componentType`);
    handlesByNode.set(node.id, validatePorts(node, path));
  }

  const edgeIds = new Set();
  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];
    const path = `edges[${index}]`;
    if (!edge || typeof edge !== "object") fail(path, "must be an object");
    requireNonEmptyString(edge.id, `${path}.id`);
    if (edgeIds.has(edge.id)) fail(`${path}.id`, `duplicates wire id "${edge.id}"`);
    edgeIds.add(edge.id);

    for (const endpoint of ["source", "target"]) {
      requireNonEmptyString(edge[endpoint], `${path}.${endpoint}`);
      if (!nodeIds.has(edge[endpoint])) fail(`${path}.${endpoint}`, `references missing node "${edge[endpoint]}"`);
    }

    for (const [nodeKey, handleKey] of [["source", "sourceHandle"], ["target", "targetHandle"]]) {
      requireNonEmptyString(edge[handleKey], `${path}.${handleKey}`);
      const handles = handlesByNode.get(edge[nodeKey]);
      if (!handles.has(edge[handleKey])) {
        fail(`${path}.${handleKey}`, `references invalid terminal "${edge[handleKey]}" on node "${edge[nodeKey]}"`);
      }
    }
  }

  return true;
}
