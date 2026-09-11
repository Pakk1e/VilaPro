function node(id, componentType, label, properties, x, y) {
  const portsByType = {
    "Voltage Source": [
      { id: "n", kind: "electrical", position: "left", label: "n" },
      { id: "p", kind: "electrical", position: "right", label: "p" },
    ],
    "Current Source": [
      { id: "n", kind: "electrical", position: "left", label: "n" },
      { id: "p", kind: "electrical", position: "right", label: "p" },
    ],
    Resistor: [
      { id: "p", kind: "electrical", position: "left", label: "p" },
      { id: "n", kind: "electrical", position: "right", label: "n" },
    ],
    Capacitor: [
      { id: "p", kind: "electrical", position: "left", label: "p" },
      { id: "n", kind: "electrical", position: "right", label: "n" },
    ],
    Ground: [{ id: "g", kind: "electrical", position: "top", label: "GND" }],
  };

  return {
    id,
    type: "world",
    position: { x, y },
    data: {
      componentType,
      label,
      properties,
      ports: portsByType[componentType] ?? [],
    },
  };
}

export function seriesCircuitFixture(overrides = {}) {
  const voltage = node("V1", "Voltage Source", "Voltage Source 1", {
    waveform: "dc",
    voltage: 10,
  }, 100, 100);
  const resistor = node("R1", "Resistor", "Resistor 1", {
    resistance: 1000,
  }, 300, 100);
  const ground = node("GND1", "Ground", "Ground 1", {}, 200, 250);

  const nodes = [voltage, resistor, ground].map((item) => ({
    ...item,
    ...(overrides[item.id] ?? {}),
    data: { ...item.data, ...(overrides[item.id]?.data ?? {}) },
  }));

  const edges = [
    { id: "e1", source: "V1", sourceHandle: "p", target: "R1", targetHandle: "p" },
    { id: "e2", source: "R1", sourceHandle: "n", target: "GND1", targetHandle: "g" },
    { id: "e3", source: "V1", sourceHandle: "n", target: "GND1", targetHandle: "g" },
  ];

  return { nodes, edges };
}

export function sineSourceFixture() {
  return seriesCircuitFixture({
    V1: {
      data: {
        properties: {
          waveform: "sine",
          amplitude: 5,
          offset: 0,
          frequency: 1,
          phase: 0,
          delay: 0,
        },
      },
    },
  });
}

export function rcCircuitFixture() {
  const voltage = node("V1", "Voltage Source", "Voltage Source 1", {
    waveform: "dc",
    voltage: 5,
  }, 100, 100);
  const resistor = node("R1", "Resistor", "Resistor 1", { resistance: 1000 }, 300, 100);
  const capacitor = node("C1", "Capacitor", "Capacitor 1", { capacitance: 0.001, initialVoltage: 0 }, 500, 100);
  const ground = node("GND1", "Ground", "Ground 1", {}, 300, 250);
  const nodes = [voltage, resistor, capacitor, ground];
  const edges = [
    { id: "e1", source: "V1", sourceHandle: "p", target: "R1", targetHandle: "p" },
    { id: "e2", source: "R1", sourceHandle: "n", target: "C1", targetHandle: "p" },
    { id: "e3", source: "C1", sourceHandle: "n", target: "GND1", targetHandle: "g" },
    { id: "e4", source: "V1", sourceHandle: "n", target: "GND1", targetHandle: "g" },
  ];
  return { nodes, edges };
}

export function acCircuitFixture() {
  return seriesCircuitFixture({
    V1: {
      data: {
        properties: {
          waveform: "sine",
          amplitude: 5,
          offset: 0,
          frequency: 1000,
          phase: 90,
          delay: 0,
        },
      },
    },
  });
}

export function currentSourceFixture() {
  const source = node("I1", "Current Source", "Current Source 1", {
    waveform: "dc",
    current: 0.01,
  }, 100, 100);
  const resistor = node("R1", "Resistor", "Resistor 1", { resistance: 1000 }, 300, 100);
  const ground = node("GND1", "Ground", "Ground 1", {}, 200, 250);
  const nodes = [source, resistor, ground];
  const edges = [
    { id: "e1", source: "I1", sourceHandle: "p", target: "R1", targetHandle: "p" },
    { id: "e2", source: "R1", sourceHandle: "n", target: "GND1", targetHandle: "g" },
    { id: "e3", source: "I1", sourceHandle: "n", target: "GND1", targetHandle: "g" },
  ];
  return { nodes, edges };
}

export function parallelResistorFixture() {
  const voltage = node("V1", "Voltage Source", "Voltage Source 1", {
    waveform: "dc",
    voltage: 10,
  }, 100, 100);
  const resistorA = node("R1", "Resistor", "Resistor 1", { resistance: 1000 }, 400, 50);
  const resistorB = node("R2", "Resistor", "Resistor 2", { resistance: 2000 }, 400, 200);
  const ground = node("GND1", "Ground", "Ground 1", {}, 250, 300);
  const junction = {
    id: "J1",
    type: "junction",
    position: { x: 250, y: 125 },
    data: {},
  };

  const nodes = [voltage, resistorA, resistorB, ground, junction];
  const edges = [
    { id: "e1", source: "V1", sourceHandle: "p", target: "J1", targetHandle: "junction-left" },
    { id: "e2", source: "J1", sourceHandle: "junction-right", target: "R1", targetHandle: "p" },
    { id: "e3", source: "J1", sourceHandle: "junction-bottom", target: "R2", targetHandle: "p" },
    { id: "e4", source: "R1", sourceHandle: "n", target: "GND1", targetHandle: "g" },
    { id: "e5", source: "R2", sourceHandle: "n", target: "GND1", targetHandle: "g" },
    { id: "e6", source: "V1", sourceHandle: "n", target: "GND1", targetHandle: "g" },
  ];

  return { nodes, edges };
}
