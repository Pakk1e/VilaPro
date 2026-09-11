function node(id, componentType, label, properties, x, y) {
  const portsByType = {
    "Voltage Source": [
      { id: "n", kind: "electrical", position: "left", label: "n" },
      { id: "p", kind: "electrical", position: "right", label: "p" },
    ],
    Resistor: [
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
