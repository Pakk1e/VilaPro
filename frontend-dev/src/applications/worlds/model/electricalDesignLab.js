export const DESIGN_LAB_COMPONENTS = [
  { id: "V1", kind: "source", name: "Voltage Source", value: "5 V" },
  { id: "R1", kind: "resistor", name: "Resistor", value: "1 kΩ" },
  { id: "C1", kind: "capacitor", name: "Capacitor", value: "10 µF" },
];

export function createDesignLabState() {
  return {
    mode: "design",
    tool: "select",
    selectedComponent: null,
    libraryOpen: false,
    inspectorOpen: false,
    resultsOpen: false,
    positions: {
      V1: { x: 26, y: 46 },
      R1: { x: 49, y: 46 },
      C1: { x: 67, y: 46 },
    },
    wireStart: null,
    connections: [],
  };
}

export function setTool(state, tool) {
  if (!["select", "wire"].includes(tool)) return state;
  return { ...state, tool, wireStart: null };
}

export function connectPort(state, componentId, side) {
  if (state.tool !== "wire") return state;
  if (!state.positions?.[componentId] || !["left", "right"].includes(side)) return state;

  if (!state.wireStart) {
    return { ...state, wireStart: { componentId, side } };
  }

  const start = state.wireStart;
  if (start.componentId === componentId && start.side === side) {
    return { ...state, wireStart: null };
  }

  const duplicate = state.connections.some(
    (connection) =>
      connection.from.componentId === start.componentId &&
      connection.from.side === start.side &&
      connection.to.componentId === componentId &&
      connection.to.side === side
  );

  if (duplicate) return { ...state, wireStart: null };

  return {
    ...state,
    wireStart: null,
    connections: [
      ...state.connections,
      {
        from: start,
        to: { componentId, side },
      },
    ],
  };
}

export function selectComponent(state, componentId) {
  return {
    ...state,
    selectedComponent: componentId,
    inspectorOpen: Boolean(componentId),
  };
}

export function togglePanel(state, panel) {
  const key = `${panel}Open`;
  if (!(key in state)) return state;
  return { ...state, [key]: !state[key] };
}

export function setMode(state, mode) {
  if (!["design", "simulate", "analyze"].includes(mode)) return state;
  return { ...state, mode };
}

export function moveComponent(state, componentId, x, y) {
  if (!state.positions?.[componentId]) return state;
  return {
    ...state,
    positions: {
      ...state.positions,
      [componentId]: {
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(8, Math.min(92, y)),
      },
    },
  };
}
