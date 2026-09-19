export const DESIGN_LAB_COMPONENTS = [
  { id: "V1", kind: "source", name: "Voltage Source", value: "5 V" },
  { id: "R1", kind: "resistor", name: "Resistor", value: "1 kΩ" },
  { id: "C1", kind: "capacitor", name: "Capacitor", value: "10 µF" },
];

export function createDesignLabState() {
  return {
    mode: "design",
    selectedComponent: null,
    libraryOpen: false,
    inspectorOpen: false,
    resultsOpen: false,
    positions: {
      V1: { x: 26, y: 46 },
      R1: { x: 49, y: 46 },
      C1: { x: 67, y: 46 },
    },
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
