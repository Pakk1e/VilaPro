const COMPONENT_X_GAP = 220;
const COMPONENT_HALF_LENGTH = 92;
const BRANCH_GAP = 130;
const CENTER_Y = 280;
const GROUND_BUS_Y = 520;
const VIEW_PADDING = 70;
const START_X = 180;

function componentPorts(instance) { return instance.ports ?? {}; }
function isTransistor(instance) { return instance.type === "NPNTransistor"; }

function buildNetGraph(instances) {
  const nets = new Map();
  for (const instance of instances) for (const [portId, net] of Object.entries(componentPorts(instance))) {
    const endpoints = nets.get(net) ?? [];
    endpoints.push({ instance, portId });
    nets.set(net, endpoints);
  }
  return nets;
}

function chooseSource(instances) { return instances.find((instance) => instance.type === "VoltageSource") ?? instances[0] ?? null; }
function otherNets(instance, net) { return Object.values(componentPorts(instance)).filter((candidate) => candidate !== net); }

function getNormalPortSign(instance, portId) {
  if (instance.type === "VoltageSource") return portId === "p" ? 1 : -1;
  return portId === "p" ? -1 : 1;
}

function buildNetLevels(instances, source, groundNet) {
  const levels = new Map();
  if (!source) return levels;
  const sourceP = componentPorts(source).p;
  if (!sourceP || sourceP === groundNet) return levels;
  levels.set(sourceP, 0);
  const queue = [sourceP];
  while (queue.length) {
    const currentNet = queue.shift();
    const currentLevel = levels.get(currentNet) ?? 0;
    for (const instance of instances) {
      if (instance === source) continue;
      const ports = componentPorts(instance);
      if (!Object.values(ports).includes(currentNet)) continue;
      for (const nextNet of otherNets(instance, currentNet)) {
        if (!nextNet || nextNet === groundNet || levels.has(nextNet)) continue;
        levels.set(nextNet, currentLevel + 1);
        queue.push(nextNet);
      }
    }
  }
  return levels;
}

function buildNetColumns(instances, source, groundNet) {
  const levels = buildNetLevels(instances, source, groundNet);
  const columns = new Map();
  const maxLevel = Math.max(...levels.values(), 0);
  for (const net of new Set(instances.flatMap((instance) => Object.values(componentPorts(instance))))) {
    if (net === groundNet) continue;
    const level = levels.get(net) ?? maxLevel + 1;
    columns.set(net, START_X + level * COMPONENT_X_GAP);
  }
  return columns;
}

function pairKey(first, second) { return [first, second].sort().join("::"); }
function assignParallelLanes(instances) {
  const groups = new Map();
  for (const instance of instances) {
    const nets = Object.values(componentPorts(instance));
    if (nets.length !== 2) continue;
    const key = pairKey(nets[0], nets[1]);
    const group = groups.get(key) ?? [];
    group.push(instance);
    groups.set(key, group);
  }
  const lanes = new Map();
  for (const group of groups.values()) {
    const center = (group.length - 1) / 2;
    group.forEach((instance, index) => lanes.set(instance.id, CENTER_Y + (index - center) * BRANCH_GAP));
  }
  return lanes;
}

function assignPositions(instances, netColumns, groundNet, source) {
  const lanes = assignParallelLanes(instances);
  const positions = new Map();
  const orientations = new Map();
  for (const instance of instances) {
    const ports = componentPorts(instance);
    if (isTransistor(instance)) {
      const xCandidates = Object.values(ports).filter((net) => net !== groundNet).map((net) => netColumns.get(net)).filter((x) => Number.isFinite(x));
      positions.set(instance.id, { x: xCandidates.length ? Math.max(...xCandidates) : START_X, y: lanes.get(instance.id) ?? CENTER_Y });
      orientations.set(instance.id, "normal");
      continue;
    }
    const pNet = ports.p;
    const nNet = ports.n;
    const pX = pNet === groundNet ? null : netColumns.get(pNet);
    const nX = nNet === groundNet ? null : netColumns.get(nNet);
    const y = lanes.get(instance.id) ?? CENTER_Y;
    const normalPSign = getNormalPortSign(instance, "p");
    const normalNSign = getNormalPortSign(instance, "n");
    if (pX !== null && nX === null) {
      const reverseGroundSource = instance.type === "VoltageSource" && instance !== source;
      const orientation = reverseGroundSource ? "reversed" : "normal";
      const pSign = orientation === "reversed" ? -normalPSign : normalPSign;
      positions.set(instance.id, { x: pX - pSign * COMPONENT_HALF_LENGTH, y });
      orientations.set(instance.id, orientation);
      continue;
    }
    if (pX === null && nX !== null) {
      positions.set(instance.id, { x: nX - normalNSign * COMPONENT_HALF_LENGTH, y });
      orientations.set(instance.id, "normal");
      continue;
    }
    if (pX !== null && nX !== null) {
      const normalOrder = normalPSign > 0 ? pX >= nX : pX <= nX;
      positions.set(instance.id, { x: (pX + nX) / 2, y });
      orientations.set(instance.id, normalOrder ? "normal" : "reversed");
      continue;
    }
    positions.set(instance.id, { x: START_X, y });
    orientations.set(instance.id, "normal");
  }
  return { positions, orientations };
}

function terminalPoint(instance, position, orientation, portId) {
  if (isTransistor(instance)) {
    if (portId === "b") return { x: position.x - 70, y: position.y };
    if (portId === "c") return { x: position.x + 28, y: position.y - 72 };
    if (portId === "e") return { x: position.x + 28, y: position.y + 72 };
    return null;
  }
  const normalSign = getNormalPortSign(instance, portId);
  const direction = orientation === "reversed" ? -normalSign : normalSign;
  return { x: position.x + direction * COMPONENT_HALF_LENGTH, y: position.y };
}

function buildWires(instances, positions, orientations, netColumns, groundNet) {
  const wires = [];
  const junctions = [];
  const terminalsByNet = new Map();
  for (const instance of instances) {
    const position = positions.get(instance.id);
    const orientation = orientations.get(instance.id) ?? "normal";
    if (!position) continue;
    for (const portId of Object.keys(componentPorts(instance))) {
      const net = componentPorts(instance)[portId];
      if (!net) continue;
      const terminal = terminalPoint(instance, position, orientation, portId);
      if (!terminal) continue;
      const bucket = terminalsByNet.get(net) ?? [];
      bucket.push({ terminal, instance, portId });
      terminalsByNet.set(net, bucket);
    }
  }

  for (const [net, terminals] of terminalsByNet.entries()) {
    if (net === groundNet) {
      terminals.forEach(({ terminal }) => wires.push({ id: `ground-${terminal.x}-${terminal.y}`, paths: [`M ${terminal.x} ${terminal.y} L ${terminal.x} ${GROUND_BUS_Y}`] }));
      continue;
    }
    const railX = netColumns.get(net);
    if (railX == null || terminals.length === 0) continue;
    for (const { terminal } of terminals) {
      if (Math.abs(terminal.x - railX) > 1) wires.push({ id: `wire-${net}-${terminal.x}-${terminal.y}`, paths: [`M ${terminal.x} ${terminal.y} L ${railX} ${terminal.y}`] });
    }
    const ys = [...new Set(terminals.map(({ terminal }) => terminal.y))];
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    if (Math.abs(maxY - minY) > 1) wires.push({ id: `bus-${net}`, paths: [`M ${railX} ${minY} L ${railX} ${maxY}`] });
    if (terminals.length >= 3) for (const y of ys) junctions.push({ id: `junction-${net}-${y}`, x: railX, y });
  }
  return { wires, junctions };
}

function getBounds(instances, positions, wires, junctions) {
  const points = [];
  for (const instance of instances) {
    const position = positions.get(instance.id);
    if (!position) continue;
    points.push({ x: position.x - COMPONENT_HALF_LENGTH, y: position.y });
    points.push({ x: position.x + COMPONENT_HALF_LENGTH, y: position.y });
    if (isTransistor(instance)) {
      points.push({ x: position.x - 70, y: position.y });
      points.push({ x: position.x + 28, y: position.y - 72 });
      points.push({ x: position.x + 28, y: position.y + 72 });
    }
  }
  points.push({ x: 0, y: GROUND_BUS_Y });
  for (const junction of junctions) points.push(junction);
  for (const wire of wires) for (const path of wire.paths) {
    const numbers = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    for (let index = 0; index < numbers.length; index += 2) points.push({ x: numbers[index], y: numbers[index + 1] });
  }
  const xs = points.map((point) => point.x), ys = points.map((point) => point.y);
  const minX = Math.min(...xs, 0) - VIEW_PADDING, maxX = Math.max(...xs, 760) + VIEW_PADDING;
  const minY = Math.min(...ys, 0) - VIEW_PADDING, maxY = Math.max(...ys, 600) + VIEW_PADDING;
  return { minX, minY, width: Math.max(maxX - minX, 620), height: Math.max(maxY - minY, 430) };
}

export function generateSchematic(description) {
  const instances = description.instances ?? [];
  const groundNet = "ground";
  const source = chooseSource(instances);
  const netGraph = buildNetGraph(instances);
  const netColumns = buildNetColumns(instances, source, groundNet);
  const { positions, orientations } = assignPositions(instances, netColumns, groundNet, source);
  const { wires, junctions } = buildWires(instances, positions, orientations, netColumns, groundNet);
  return { instances, source, netGraph, netColumns, positions, orientations, wires, junctions, groundNet, bounds: getBounds(instances, positions, wires, junctions) };
}

export function getSchematicPort(instance, portId, schematic) {
  const position = schematic.positions.get(instance.id);
  if (!position) return null;
  return terminalPoint(instance, position, schematic.orientations.get(instance.id) ?? "normal", portId);
}
