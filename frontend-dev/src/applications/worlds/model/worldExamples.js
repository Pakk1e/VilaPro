function makeNode(id, definitionKey, label, properties, x, y) {
  const portsByDefinition = {
    voltageSource: [
      { id: "n", kind: "electrical", position: "left", label: "n" },
      { id: "p", kind: "electrical", position: "right", label: "p" },
    ],
    currentSource: [
      { id: "p", kind: "electrical", position: "left", label: "p" },
      { id: "n", kind: "electrical", position: "right", label: "n" },
    ],
    resistor: [
      { id: "p", kind: "electrical", position: "left", label: "p" },
      { id: "n", kind: "electrical", position: "right", label: "n" },
    ],
    capacitor: [
      { id: "p", kind: "electrical", position: "left", label: "p" },
      { id: "n", kind: "electrical", position: "right", label: "n" },
    ],
    inductor: [
      { id: "p", kind: "electrical", position: "left", label: "p" },
      { id: "n", kind: "electrical", position: "right", label: "n" },
    ],
    ground: [{ id: "g", kind: "electrical", position: "top", label: "GND" }],
  };

  const componentTypes = {
    voltageSource: "Voltage Source",
    currentSource: "Current Source",
    resistor: "Resistor",
    capacitor: "Capacitor",
    inductor: "Inductor",
    ground: "Ground",
  };

  return {
    id,
    type: "world",
    position: { x, y },
    data: {
      label,
      description: componentTypes[definitionKey],
      componentType: componentTypes[definitionKey],
      ports: portsByDefinition[definitionKey],
      definitionKey,
      properties,
    },
  };
}

function makeEdge(id, source, sourceHandle, target, targetHandle) {
  return { id, source, sourceHandle, target, targetHandle, type: "circuit" };
}

export const WORLD_EXAMPLES = Object.freeze([
  Object.freeze({
    id: "voltage-divider",
    label: "Voltage divider",
    description: "10 V source with two resistors in series.",
    createGraph: () => ({
      nodes: [
        makeNode("V1", "voltageSource", "Voltage Source 1", { waveform: "dc", voltage: 10 }, 80, 120),
        makeNode("R1", "resistor", "Resistor 1", { resistance: 1000 }, 300, 80),
        makeNode("R2", "resistor", "Resistor 2", { resistance: 1000 }, 300, 220),
        makeNode("GND1", "ground", "Ground 1", {}, 520, 150),
      ],
      edges: [
        makeEdge("e1", "V1", "p", "R1", "p"),
        makeEdge("e2", "R1", "n", "R2", "p"),
        makeEdge("e3", "R2", "n", "GND1", "g"),
        makeEdge("e4", "V1", "n", "GND1", "g"),
      ],
    }),
  }),
  Object.freeze({
    id: "rc-low-pass",
    label: "RC low-pass",
    description: "Sine source driving a resistor-capacitor network.",
    createGraph: () => ({
      nodes: [
        makeNode("V1", "voltageSource", "Voltage Source 1", { waveform: "sine", amplitude: 5, offset: 0, frequency: 1000, phase: 0, delay: 0 }, 60, 120),
        makeNode("R1", "resistor", "Resistor 1", { resistance: 1000 }, 270, 120),
        makeNode("C1", "capacitor", "Capacitor 1", { capacitance: 0.000001, initialVoltage: 0 }, 480, 120),
        makeNode("GND1", "ground", "Ground 1", {}, 380, 280),
      ],
      edges: [
        makeEdge("e1", "V1", "p", "R1", "p"),
        makeEdge("e2", "R1", "n", "C1", "p"),
        makeEdge("e3", "C1", "n", "GND1", "g"),
        makeEdge("e4", "V1", "n", "GND1", "g"),
      ],
    }),
  }),
  Object.freeze({
    id: "parallel-resistors",
    label: "Parallel resistors",
    description: "Two resistor branches across a 10 V source.",
    createGraph: () => ({
      nodes: [
        makeNode("V1", "voltageSource", "Voltage Source 1", { waveform: "dc", voltage: 10 }, 60, 150),
        makeNode("R1", "resistor", "Resistor 1", { resistance: 1000 }, 360, 70),
        makeNode("R2", "resistor", "Resistor 2", { resistance: 2000 }, 360, 230),
        makeNode("GND1", "ground", "Ground 1", {}, 600, 150),
        { id: "J1", type: "junction", position: { x: 230, y: 150 }, data: { kind: "junction", portKind: "electrical" } },
      ],
      edges: [
        makeEdge("e1", "V1", "p", "J1", "junction-left"),
        makeEdge("e2", "J1", "junction-right", "R1", "p"),
        makeEdge("e3", "J1", "junction-bottom", "R2", "p"),
        makeEdge("e4", "R1", "n", "GND1", "g"),
        makeEdge("e5", "R2", "n", "GND1", "g"),
        makeEdge("e6", "V1", "n", "GND1", "g"),
      ],
    }),
  }),
  Object.freeze({
    id: "rl-transient",
    label: "RL transient",
    description: "10 V source driving a resistor-inductor transient response.",
    createGraph: () => ({
      nodes: [
        makeNode("V1", "voltageSource", "Voltage Source 1", { waveform: "dc", voltage: 10 }, 70, 140),
        makeNode("R1", "resistor", "Resistor 1", { resistance: 1000 }, 290, 140),
        makeNode("L1", "inductor", "Inductor 1", { inductance: 0.01, initialCurrent: 0 }, 500, 140),
        makeNode("GND1", "ground", "Ground 1", {}, 390, 300),
      ],
      edges: [
        makeEdge("e1", "V1", "p", "R1", "p"),
        makeEdge("e2", "R1", "n", "L1", "p"),
        makeEdge("e3", "L1", "n", "GND1", "g"),
        makeEdge("e4", "V1", "n", "GND1", "g"),
      ],
    }),
  }),
  Object.freeze({
    id: "rlc-transient",
    label: "RLC transient",
    description: "10 V source driving a resistor-inductor-capacitor transient response.",
    createGraph: () => ({
      nodes: [
        makeNode("V1", "voltageSource", "Voltage Source 1", { waveform: "dc", voltage: 10 }, 50, 140),
        makeNode("R1", "resistor", "Resistor 1", { resistance: 100 }, 240, 140),
        makeNode("L1", "inductor", "Inductor 1", { inductance: 0.01, initialCurrent: 0 }, 430, 140),
        makeNode("C1", "capacitor", "Capacitor 1", { capacitance: 0.000001, initialVoltage: 0 }, 620, 140),
        makeNode("GND1", "ground", "Ground 1", {}, 330, 300),
      ],
      edges: [
        makeEdge("e1", "V1", "p", "R1", "p"),
        makeEdge("e2", "R1", "n", "L1", "p"),
        makeEdge("e3", "L1", "n", "C1", "p"),
        makeEdge("e4", "C1", "n", "GND1", "g"),
        makeEdge("e5", "V1", "n", "GND1", "g"),
      ],
    }),
  }),
]);
