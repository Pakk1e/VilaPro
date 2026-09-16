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
