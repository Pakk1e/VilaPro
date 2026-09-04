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
  },

  voltageSource: {
    type: "Voltage Source",
    description: "Ideal electrical voltage source",
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
      voltage: {
        type: "number",
        label: "Voltage",
        unit: "V",
        defaultValue: 12,
      },
    },
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
