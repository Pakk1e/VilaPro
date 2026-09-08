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

export function describeCircuitNode(result, nodeId) {
  if (!nodeId) return "Unknown node";

  const node = getCircuitNode(result, nodeId);
  if (!node) return nodeId;
  if (node.is_ground) return "Ground";

  const connections = Array.isArray(node.connections) ? node.connections : [];
  if (connections.length === 0) return node.label ?? node.id;

  const connectionSummary = connections
    .map((connection) => `${connection.instance_name ?? connection.instance_id}.${connection.port_label ?? connection.port_id}`)
    .join(" / ");

  return `${node.label ?? node.id} — ${connectionSummary}`;
}

export function describeCircuitBranch(result, branchKey) {
  if (!branchKey) return "Unknown branch";

  const [firstNode, secondNode] = String(branchKey).split("->");
  const context = getCircuitContext(result);
  const branch = Array.isArray(context?.branches)
    ? context.branches.find(
        (item) =>
          item?.positive?.node === firstNode && item?.negative?.node === secondNode
      ) ?? context.branches.find(
        (item) =>
          item?.positive?.node === secondNode && item?.negative?.node === firstNode
      )
    : null;

  if (!branch) return `${describeCircuitNode(result, firstNode)} → ${describeCircuitNode(result, secondNode)}`;

  return `${branch.name ?? branch.id}: ${branch.positive?.port_id ?? "p"} → ${branch.negative?.port_id ?? "n"}`;
}
