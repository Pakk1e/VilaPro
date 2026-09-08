export function getCircuitContext(result) {
  const context = result?.result?.circuit_context;
  return context && typeof context === "object" ? context : null;
}

export function getCircuitNodes(result) {
  const nodes = getCircuitContext(result)?.nodes;
  return Array.isArray(nodes) ? nodes : [];
}

export function getCircuitComponents(result) {
  const components = getCircuitContext(result)?.components;
  return Array.isArray(components) ? components : [];
}

export function getCircuitNode(result, nodeId) {
  return getCircuitNodes(result).find((node) => node?.id === nodeId) ?? null;
}

export function getCircuitComponent(result, componentId) {
  return getCircuitComponents(result).find((component) => component?.id === componentId) ?? null;
}

function getNodeConnectionSummary(node) {
  const connections = Array.isArray(node?.connections) ? node.connections : [];
  return connections.map((connection) => ({
    instanceId: connection.instance_id,
    instanceName: connection.instance_name ?? connection.instance_id,
    portId: connection.port_id,
    portLabel: connection.port_label ?? connection.port_id,
    componentType: connection.component_type,
  }));
}

export function describeCircuitNode(result, nodeId) {
  if (!nodeId) return "Unknown node";

  const node = getCircuitNode(result, nodeId);
  if (!node) return nodeId;
  if (node.is_ground) return "Ground";

  const connections = getNodeConnectionSummary(node);
  if (connections.length === 0) return node.label ?? node.id;

  const connectionSummary = connections
    .map((connection) => `${connection.instanceName}.${connection.portLabel}`)
    .join(" / ");

  return `${node.label ?? node.id} — ${connectionSummary}`;
}

export function getCircuitNodeConnectionSummary(result, nodeId) {
  const node = getCircuitNode(result, nodeId);
  return getNodeConnectionSummary(node);
}

export function getCircuitBranch(result, branchKey) {
  if (!branchKey) return null;

  const [firstNode, secondNode] = String(branchKey).split("->");
  const branches = getCircuitContext(result)?.branches;
  if (!Array.isArray(branches)) return null;

  return branches.find(
    (item) => item?.positive?.node === firstNode && item?.negative?.node === secondNode
  ) ?? branches.find(
    (item) => item?.positive?.node === secondNode && item?.negative?.node === firstNode
  ) ?? null;
}

export function describeCircuitBranch(result, branchKey) {
  if (!branchKey) return "Unknown branch";

  const branch = getCircuitBranch(result, branchKey);
  if (!branch) {
    const [firstNode, secondNode] = String(branchKey).split("->");
    return `${describeCircuitNode(result, firstNode)} → ${describeCircuitNode(result, secondNode)}`;
  }

  const positiveNode = describeCircuitNode(result, branch.positive?.node);
  const negativeNode = describeCircuitNode(result, branch.negative?.node);
  return `${branch.name ?? branch.id}: ${positiveNode} → ${negativeNode}`;
}

export function describeCircuitComponent(result, componentId) {
  const component = getCircuitComponent(result, componentId);
  if (!component) return componentId ?? "Unknown component";

  const ports = Object.entries(component.ports ?? {})
    .map(([portId, port]) => `${port?.label ?? portId}: ${describeCircuitNode(result, port?.node)}`)
    .join(" · ");

  return ports ? `${component.name ?? component.id} — ${ports}` : (component.name ?? component.id);
}
