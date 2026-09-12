import { validateWorldGraphSchema } from "./worldGraphSchema.js";

const ELECTRONICS_WORLD_SOURCE = `
world Electronics {
    port_type ElectricalNode;
    quantity Current { dimension: I; unit: A; }
    quantity Power { dimension: M * L^2 / T^3; unit: W; }
    quantity Voltage { dimension: Power / Current; unit: V; }
    quantity Resistance { dimension: Voltage / Current; unit: Ohm; }
    quantity Capacitance { dimension: Current * T / Voltage; unit: F; }
    quantity Inductance { dimension: Voltage * T / Current; unit: H; }
    quantity Gain { dimension: Current / Current; }
    component Resistor { parameter R : Resistance; interface { p : ElectricalNode; n : ElectricalNode; } representation ideal { equation: voltage(p, n) = current(p, n) * R; } }
    component Diode { parameter Vf : Voltage; parameter Ron : Resistance; interface { p : ElectricalNode; n : ElectricalNode; } representation piecewise_linear { equation: voltage(p, n) = current(p, n) * Ron + Vf; } }
    component NPNTransistor { parameter Vbe : Voltage; parameter VceSat : Voltage; parameter Beta : Gain; interface { b : ElectricalNode; c : ElectricalNode; e : ElectricalNode; } representation piecewise_linear { equation: voltage(b, e) = Vbe; equation: current(c, e) = Beta * current(b, e); } }
    component VoltageSource { parameter V : Voltage; interface { p : ElectricalNode; n : ElectricalNode; } representation ideal { equation: voltage(p, n) = V; } }
    component CurrentSource { parameter I : Current; interface { p : ElectricalNode; n : ElectricalNode; } representation ideal { equation: current(p, n) = I; } }
    component Capacitor { parameter C : Capacitance; interface { p : ElectricalNode; n : ElectricalNode; } representation ideal { equation: current(p, n) = C * derivative(voltage(p, n), time); } }
    component Inductor { parameter L : Inductance; interface { p : ElectricalNode; n : ElectricalNode; } representation ideal { equation: voltage(p, n) = L * derivative(current(p, n), time); } }
}
`;

const PROPERTY_TO_PARAMETER = {
  Resistor: { backendType: "Resistor", parameter: { resistance: "R" } },
  Diode: { backendType: "Diode", parameter: { forwardVoltage: "Vf", onResistance: "Ron" } },
  "NPN Transistor": { backendType: "NPNTransistor", parameter: { vbeOn: "Vbe", vceSat: "VceSat", beta: "Beta" } },
  "Voltage Source": { backendType: "VoltageSource", parameter: { voltage: "V" } },
  "Current Source": { backendType: "CurrentSource", parameter: { current: "I" } },
  Capacitor: { backendType: "Capacitor", parameter: { capacitance: "C" } },
  Inductor: { backendType: "Inductor", parameter: { inductance: "L" } },
};

function endpointKey(nodeId, handleId) { return `${nodeId}::${handleId}`; }
class DisjointSet {
  constructor() { this.parent = new Map(); }
  add(value) { if (!this.parent.has(value)) this.parent.set(value, value); }
  find(value) { this.add(value); let current = value; while (this.parent.get(current) !== current) current = this.parent.get(current); const root = current; current = value; while (this.parent.get(current) !== current) { const next = this.parent.get(current); this.parent.set(current, root); current = next; } return root; }
  union(first, second) { const a = this.find(first), b = this.find(second); if (a !== b) this.parent.set(b, a); }
}
function getComponentPorts(node) { return node.data?.ports ?? []; }
function getBackendType(node) { const type = node.data?.componentType; if (!type) throw new Error(`Node "${node.id}" has no component type`); const definition = PROPERTY_TO_PARAMETER[type]; if (!definition) throw new Error(`Component "${type}" is not yet supported by the simulation bridge`); return definition.backendType; }

export function validateWorldGraph(nodes, edges) {
  const grounds = nodes.filter((node) => node.data?.componentType === "Ground");
  if (grounds.length === 0) throw new Error("Ground is required before the circuit can be simulated.");
  if (grounds.length > 1) throw new Error("The circuit must contain only one Ground component.");
  validateWorldGraphSchema(nodes, edges);
  const nodeIds = new Set(); const valid = new Set();
  for (const node of nodes) {
    if (!node?.id || nodeIds.has(node.id)) throw new Error("Circuit contains duplicate or missing node ids.");
    nodeIds.add(node.id);
    if (node.type === "junction") { for (const handle of ["junction-top", "junction-right", "junction-bottom", "junction-left"]) valid.add(endpointKey(node.id, handle)); continue; }
    if (node.type !== "world") throw new Error(`Circuit contains unsupported node type "${node.type}".`);
    if (!node.data?.componentType) throw new Error(`Node "${node.id}" has no component type`);
    const ports = getComponentPorts(node); const portIds = new Set();
    for (const port of ports) { if (!port?.id || portIds.has(port.id)) throw new Error(`${node.data?.label ?? node.id}: circuit contains duplicate or missing port ids.`); portIds.add(port.id); valid.add(endpointKey(node.id, port.id)); }
  }
  const connected = new Set(); const edgeIds = new Set();
  for (const edge of edges) {
    if (!edge?.id || edgeIds.has(edge.id)) throw new Error("Circuit contains duplicate or missing wire ids.");
    edgeIds.add(edge.id);
    if (!edge.source || !edge.target || !edge.sourceHandle || !edge.targetHandle) throw new Error("Circuit contains an invalid wire endpoint.");
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) throw new Error("Circuit contains a wire referencing a missing node.");
    const source = endpointKey(edge.source, edge.sourceHandle), target = endpointKey(edge.target, edge.targetHandle);
    if (!valid.has(source) || !valid.has(target)) throw new Error("Circuit contains a wire connected to an invalid terminal.");
    connected.add(source); connected.add(target);
  }
  for (const node of nodes) if (node.type === "world") for (const port of getComponentPorts(node)) { const endpoint = endpointKey(node.id, port.id); if (!connected.has(endpoint)) throw new Error(`${node.data?.label ?? node.id}: terminal "${port.label ?? port.id}" is unconnected.`); }
}

function buildConnectivity(nodes, edges) {
  const dsu = new DisjointSet();
  for (const node of nodes) { if (node.type === "junction") for (const handle of ["junction-top", "junction-right", "junction-bottom", "junction-left"]) dsu.add(endpointKey(node.id, handle)); else for (const port of getComponentPorts(node)) dsu.add(endpointKey(node.id, port.id)); }
  dsu.add("ground");
  for (const edge of edges) dsu.union(endpointKey(edge.source, edge.sourceHandle), endpointKey(edge.target, edge.targetHandle));
  for (const node of nodes) if (node.type === "junction") { const handles = ["junction-top", "junction-right", "junction-bottom", "junction-left"], first = endpointKey(node.id, handles[0]); for (const handle of handles.slice(1)) dsu.union(first, endpointKey(node.id, handle)); }
  for (const node of nodes) if (node.data?.componentType === "Ground") dsu.union(endpointKey(node.id, "g"), "ground");
  return dsu;
}
function buildNetNames(nodes, dsu) { const roots = new Map(); for (const node of nodes) if (node.type !== "junction") for (const port of getComponentPorts(node)) { const root = dsu.find(endpointKey(node.id, port.id)); if (!roots.has(root)) roots.set(root, `node_${roots.size + 1}`); } return roots; }
function getPortNet(node, portId, dsu, netNames) { const root = dsu.find(endpointKey(node.id, portId)); if (root === dsu.find("ground")) return "ground"; const net = netNames.get(root); if (!net) throw new Error(`Unable to resolve electrical net for ${node.data?.label ?? node.id}:${portId}`); return net; }
function parseFiniteProperty(properties, propertyName, label) { const value = properties[propertyName]; if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label}: property "${propertyName}" must be a finite number`); return value; }

function buildSourceParameter(componentType, properties, label) {
  const waveform = properties.waveform ?? "dc";
  if (!["dc", "sine", "square"].includes(waveform)) throw new Error(`${label}: property "waveform" must be one of DC, Sine, Square`);
  if (waveform === "dc") { const propertyName = componentType === "Voltage Source" ? "voltage" : "current"; const parameterName = componentType === "Voltage Source" ? "V" : "I"; return { [parameterName]: parseFiniteProperty(properties, propertyName, label) }; }
  const amplitude = properties.amplitude ?? (componentType === "Voltage Source" ? 12 : 0.1), offset = properties.offset ?? 0, frequency = properties.frequency ?? 1, phaseDegrees = properties.phase ?? 0, delay = properties.delay ?? 0;
  for (const [propertyName, value] of Object.entries({ amplitude, offset, frequency, phase: phaseDegrees, delay })) if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label}: property "${propertyName}" must be a finite number`);
  if (amplitude < 0) throw new Error(`${label}: property "amplitude" must not be negative`);
  if (frequency <= 0) throw new Error(`${label}: property "frequency" must be greater than zero for periodic waveforms`);
  if (delay < 0) throw new Error(`${label}: property "delay" must not be negative`);
  const parameterName = componentType === "Voltage Source" ? "V" : "I";
  return { [parameterName]: { waveform, amplitude, offset, frequency, phase: phaseDegrees * Math.PI / 180, delay } };
}

function buildInstance(node, dsu, netNames) {
  const componentType = node.data?.componentType; const definition = PROPERTY_TO_PARAMETER[componentType]; const properties = node.data?.properties ?? {}; const parameters = {};
  if (componentType === "Voltage Source" || componentType === "Current Source") Object.assign(parameters, buildSourceParameter(componentType, properties, node.data?.label ?? node.id));
  else { for (const [propertyName, parameterName] of Object.entries(definition.parameter)) { const value = parseFiniteProperty(properties, propertyName, node.data?.label ?? node.id); if (value <= 0) throw new Error(`${node.data?.label ?? node.id}: property "${propertyName}" must be greater than zero`); parameters[parameterName] = value; } }
  const ports = {}; for (const port of getComponentPorts(node)) ports[port.id] = getPortNet(node, port.id, dsu, netNames);
  return { id: node.id, name: node.data?.label ?? node.id, type: getBackendType(node), parameters, ports };
}

export function buildCircuitDescription(nodes, edges) {
  const componentNodes = nodes.filter((node) => node.type === "world" && node.data?.componentType !== "Ground");
  if (componentNodes.length === 0) throw new Error("Add at least one simulation component.");
  validateWorldGraph(nodes, edges);
  const dsu = buildConnectivity(nodes, edges), netNames = buildNetNames(componentNodes.concat(nodes.filter((node) => node.type === "world" && node.data?.componentType === "Ground")), dsu);
  return { instances: componentNodes.map((node) => buildInstance(node, dsu, netNames)) };
}
export function serializeWorldGraph(nodes, edges) { const description = buildCircuitDescription(nodes, edges); return { world_source: ELECTRONICS_WORLD_SOURCE.trim(), instances: description.instances }; }
