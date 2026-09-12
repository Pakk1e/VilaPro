export const worldDefinitions = {
  resistor: {
    type: "Resistor", description: "Electrical resistance", category: "Electrical",
    ports: [{ id: "p", kind: "electrical", position: "left", label: "p" }, { id: "n", kind: "electrical", position: "right", label: "n" }],
    properties: { resistance: { type: "number", label: "Resistance", unit: "Ω", defaultValue: 100 } },
    simulationParameters: [{ property: "resistance", parameter: "R", label: "Resistance", unit: "Ω" }],
  },
  diode: {
    type: "Diode", description: "Semiconductor diode with forward conduction and reverse blocking", category: "Electrical",
    ports: [{ id: "p", kind: "electrical", position: "left", label: "p" }, { id: "n", kind: "electrical", position: "right", label: "n" }],
    properties: { forwardVoltage: { type: "number", label: "Forward voltage", unit: "V", defaultValue: 0.7, min: 0 }, onResistance: { type: "number", label: "On resistance", unit: "Ω", defaultValue: 1, min: 0 } },
    simulationParameters: [{ property: "forwardVoltage", parameter: "Vf", label: "Forward voltage", unit: "V" }, { property: "onResistance", parameter: "Ron", label: "On resistance", unit: "Ω" }],
  },
  npnTransistor: {
    type: "NPN Transistor", description: "Three-terminal bipolar transistor with cutoff, active and saturation regions", category: "Electrical",
    ports: [{ id: "b", kind: "electrical", position: "left", label: "B" }, { id: "c", kind: "electrical", position: "top", label: "C" }, { id: "e", kind: "electrical", position: "bottom", label: "E" }],
    properties: { vbeOn: { type: "number", label: "VBE on", unit: "V", defaultValue: 0.7, min: 0 }, vceSat: { type: "number", label: "VCE saturation", unit: "V", defaultValue: 0.2, min: 0 }, beta: { type: "number", label: "DC beta", unit: "", defaultValue: 100, min: 0 } },
    simulationParameters: [{ property: "vbeOn", parameter: "Vbe", label: "VBE on", unit: "V" }, { property: "vceSat", parameter: "VceSat", label: "VCE saturation", unit: "V" }, { property: "beta", parameter: "Beta", label: "DC beta", unit: "" }],
  },
  pnpTransistor: {
    type: "PNP Transistor", description: "Three-terminal bipolar transistor with cutoff, active and saturation regions", category: "Electrical",
    ports: [{ id: "b", kind: "electrical", position: "left", label: "B" }, { id: "c", kind: "electrical", position: "top", label: "C" }, { id: "e", kind: "electrical", position: "bottom", label: "E" }],
    properties: { vbeOn: { type: "number", label: "VEB on", unit: "V", defaultValue: 0.7, min: 0 }, vceSat: { type: "number", label: "VEC saturation", unit: "V", defaultValue: 0.2, min: 0 }, beta: { type: "number", label: "DC beta", unit: "", defaultValue: 100, min: 0 } },
    simulationParameters: [{ property: "vbeOn", parameter: "Vbe", label: "VEB on", unit: "V" }, { property: "vceSat", parameter: "VceSat", label: "VEC saturation", unit: "V" }, { property: "beta", parameter: "Beta", label: "DC beta", unit: "" }],
  },
  capacitor: {
    type: "Capacitor", description: "Electrical capacitance", category: "Electrical",
    ports: [{ id: "p", kind: "electrical", position: "left", label: "p" }, { id: "n", kind: "electrical", position: "right", label: "n" }],
    properties: { capacitance: { type: "number", label: "Capacitance", unit: "F", defaultValue: 0.001 }, initialVoltage: { type: "number", label: "Initial voltage", unit: "V", defaultValue: 0 } },
    simulationParameters: [{ property: "capacitance", parameter: "C", label: "Capacitance", unit: "F" }, { property: "initialVoltage", parameter: "initial_voltage", label: "Initial voltage", unit: "V" }],
  },
  inductor: {
    type: "Inductor", description: "Electrical inductance", category: "Electrical",
    ports: [{ id: "p", kind: "electrical", position: "left", label: "p" }, { id: "n", kind: "electrical", position: "right", label: "n" }],
    properties: { inductance: { type: "number", label: "Inductance", unit: "H", defaultValue: 0.01 }, initialCurrent: { type: "number", label: "Initial current", unit: "A", defaultValue: 0 } },
    simulationParameters: [{ property: "inductance", parameter: "L", label: "Inductance", unit: "H" }, { property: "initialCurrent", parameter: "initial_current", label: "Initial current", unit: "A" }],
  },
  voltageSource: {
    type: "Voltage Source", description: "Ideal electrical voltage source", category: "Electrical",
    ports: [{ id: "n", kind: "electrical", position: "left", label: "n" }, { id: "p", kind: "electrical", position: "right", label: "p" }],
    properties: { waveform: { type: "select", label: "Waveform", options: [{ value: "dc", label: "DC" }, { value: "sine", label: "Sine" }, { value: "square", label: "Square" }], defaultValue: "dc" }, voltage: { type: "number", label: "Voltage", unit: "V", defaultValue: 12, visibleWhen: { property: "waveform", equals: "dc" } }, amplitude: { type: "number", label: "Amplitude", unit: "V", defaultValue: 12, min: 0, visibleWhen: { property: "waveform", notEquals: "dc" }, showOnNode: false }, offset: { type: "number", label: "Offset", unit: "V", defaultValue: 0, visibleWhen: { property: "waveform", notEquals: "dc" }, showOnNode: false }, frequency: { type: "number", label: "Frequency", unit: "Hz", defaultValue: 1, min: 0, visibleWhen: { property: "waveform", notEquals: "dc" }, showOnNode: false }, phase: { type: "number", label: "Phase", unit: "°", defaultValue: 0, visibleWhen: { property: "waveform", notEquals: "dc" }, showOnNode: false }, delay: { type: "number", label: "Delay", unit: "s", defaultValue: 0, min: 0, visibleWhen: { property: "waveform", notEquals: "dc" }, showOnNode: false } },
    simulationParameters: [{ property: "voltage", parameter: "V", label: "Voltage", unit: "V" }],
  },
  currentSource: {
    type: "Current Source", description: "Ideal electrical current source", category: "Electrical",
    ports: [{ id: "p", kind: "electrical", position: "left", label: "p" }, { id: "n", kind: "electrical", position: "right", label: "n" }],
    properties: { waveform: { type: "select", label: "Waveform", options: [{ value: "dc", label: "DC" }, { value: "sine", label: "Sine" }, { value: "square", label: "Square" }], defaultValue: "dc" }, current: { type: "number", label: "Current", unit: "A", defaultValue: 0.1, visibleWhen: { property: "waveform", equals: "dc" } }, amplitude: { type: "number", label: "Amplitude", unit: "A", defaultValue: 0.1, min: 0, visibleWhen: { property: "waveform", notEquals: "dc" }, showOnNode: false }, offset: { type: "number", label: "Offset", unit: "A", defaultValue: 0, visibleWhen: { property: "waveform", notEquals: "dc" }, showOnNode: false }, frequency: { type: "number", label: "Frequency", unit: "Hz", defaultValue: 1, min: 0, visibleWhen: { property: "waveform", notEquals: "dc" }, showOnNode: false }, phase: { type: "number", label: "Phase", unit: "°", defaultValue: 0, visibleWhen: { property: "waveform", notEquals: "dc" }, showOnNode: false }, delay: { type: "number", label: "Delay", unit: "s", defaultValue: 0, min: 0, visibleWhen: { property: "waveform", notEquals: "dc" }, showOnNode: false } },
    simulationParameters: [{ property: "current", parameter: "I", label: "Current", unit: "A" }],
  },
  ground: { type: "Ground", description: "Electrical reference node", category: "Electrical", ports: [{ id: "g", kind: "electrical", position: "top", label: "GND" }], properties: {} },
};
