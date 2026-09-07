export const worldDefinitions = {
  resistor: {
    type: "Resistor",
    description: "Electrical resistance",
    category: "Electrical",

    ports: [
      {
        id: "p",
        kind: "electrical",
        position: "left",
        label: "p",
      },
      {
        id: "n",
        kind: "electrical",
        position: "right",
        label: "n",
      },
    ],

    properties: {
      resistance: {
        type: "number",
        label: "Resistance",
        unit: "Ω",
        defaultValue: 100,
      },
    },

    simulationParameters: [
      { property: "resistance", parameter: "R", label: "Resistance", unit: "Ω" },
    ],
  },

  voltageSource: {
    type: "Voltage Source",
    description: "Ideal electrical voltage source",
    category: "Electrical",

    ports: [
      {
        id: "n",
        kind: "electrical",
        position: "left",
        label: "n",
      },
      {
        id: "p",
        kind: "electrical",
        position: "right",
        label: "p",
      },
    ],

    properties: {
      voltage: {
        type: "number",
        label: "Voltage",
        unit: "V",
        defaultValue: 12,
      },
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
      {
        id: "p",
        kind: "electrical",
        position: "left",
        label: "p",
      },
      {
        id: "n",
        kind: "electrical",
        position: "right",
        label: "n",
      },
    ],

    properties: {
      current: {
        type: "number",
        label: "Current",
        unit: "A",
        defaultValue: 0.1,
      },
    },

    simulationParameters: [
      { property: "current", parameter: "I", label: "Current", unit: "A" },
    ],
  },

  ground: {
    type: "Ground",
    description: "Electrical reference node",
    category: "Electrical",

    ports: [
      {
        id: "g",
        kind: "electrical",
        position: "top",
        label: "GND",
      },
    ],

    properties: {},
  },
};
