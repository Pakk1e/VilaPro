export const worldDefinitions = {
  resistor: {
    type: "Resistor",
    description: "Electrical resistance",
    category: "Electrical",
    ports: [
      { id: "p", kind: "electrical", position: "left", label: "p" },
      { id: "n", kind: "electrical", position: "right", label: "n" },
    ],
    properties: {
      resistance: { type: "number", label: "Resistance", unit: "Ω", defaultValue: 100 },
    },
    simulationParameters: [
      { property: "resistance", parameter: "R", label: "Resistance", unit: "Ω" },
    ],
  },

  capacitor: {
    type: "Capacitor",
    description: "Electrical capacitance",
    category: "Electrical",
    ports: [
      { id: "p", kind: "electrical", position: "left", label: "p" },
      { id: "n", kind: "electrical", position: "right", label: "n" },
    ],
    properties: {
      capacitance: { type: "number", label: "Capacitance", unit: "F", defaultValue: 0.001 },
      initialVoltage: { type: "number", label: "Initial voltage", unit: "V", defaultValue: 0 },
    },
    simulationParameters: [
      { property: "capacitance", parameter: "C", label: "Capacitance", unit: "F" },
      { property: "initialVoltage", parameter: "initial_voltage", label: "Initial voltage", unit: "V" },
    ],
  },

  inductor: {
    type: "Inductor",
    description: "Electrical inductance",
    category: "Electrical",
    ports: [
      { id: "p", kind: "electrical", position: "left", label: "p" },
      { id: "n", kind: "electrical", position: "right", label: "n" },
    ],
    properties: {
      inductance: { type: "number", label: "Inductance", unit: "H", defaultValue: 0.01 },
      initialCurrent: { type: "number", label: "Initial current", unit: "A", defaultValue: 0 },
    },
    simulationParameters: [
      { property: "inductance", parameter: "L", label: "Inductance", unit: "H" },
      { property: "initialCurrent", parameter: "initial_current", label: "Initial current", unit: "A" },
    ],
  },

  voltageSource: {
    type: "Voltage Source",
    description: "Ideal electrical voltage source",
    category: "Electrical",
    ports: [
      { id: "n", kind: "electrical", position: "left", label: "n" },
      { id: "p", kind: "electrical", position: "right", label: "p" },
    ],
    properties: {
      voltage: { type: "number", label: "Voltage", unit: "V", defaultValue: 12 },
    },
    simulationParameters: [
      { property: "voltage", parameter: "V", label: "Voltage", unit: "V" },
    ],
  },

  currentSource: {
    type: "Current Source",
    description: "Ideal electrical current source",
    category: "Electrical",
    ports: [
      { id: "p", kind: "electrical", position: "left", label: "p" },
      { id: "n", kind: "electrical", position: "right", label: "n" },
    ],
    properties: {
      current: { type: "number", label: "Current", unit: "A", defaultValue: 0.1 },
    },
    simulationParameters: [
      { property: "current", parameter: "I", label: "Current", unit: "A" },
    ],
  },

  ground: {
    type: "Ground",
    description: "Electrical reference node",
    category: "Electrical",
    ports: [{ id: "g", kind: "electrical", position: "top", label: "GND" }],
    properties: {},
  },
};
