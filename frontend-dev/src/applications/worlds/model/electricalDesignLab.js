export const DESIGN_LAB_COMPONENTS = [
  { id: "V1", kind: "source", name: "Voltage Source", value: "5 V" },
  { id: "R1", kind: "resistor", name: "Resistor", value: "1 kΩ" },
  { id: "C1", kind: "capacitor", name: "Capacitor", value: "10 µF" },
];

export const DESIGN_LAB_LIBRARY = [
  { kind: "source", name: "Voltage Source", value: "5 V" },
  { kind: "resistor", name: "Resistor", value: "1 kΩ" },
  { kind: "capacitor", name: "Capacitor", value: "10 µF" },
];

export function createDesignLabState() {
  return {
    mode: "design",
    tool: "select",
    selectedComponent: null,
    selectedComponents: [],
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
    selectedConnection: null,
    deletedComponents: [],
    placedComponents: [],
    placementKind: null,
    values: {
      V1: "5 V",
      R1: "1 kΩ",
      C1: "10 µF",
    },
    gridEnabled: true,
    gridSize: 2,
    rotations: {
      V1: 0,
      R1: 0,
      C1: 0,
    },
  };
}

export function deleteComponent(state, componentId) {
  if (!state.positions?.[componentId] || state.deletedComponents.includes(componentId)) return state;
  const selectedComponents = (state.selectedComponents || []).filter((id) => id !== componentId);
  return {
    ...state,
    selectedComponent: state.selectedComponent === componentId
      ? selectedComponents[selectedComponents.length - 1] ?? null
      : state.selectedComponent,
    selectedComponents,
    inspectorOpen: selectedComponents.length === 1 && state.selectedComponent === componentId,
    deletedComponents: [...state.deletedComponents, componentId],
    connections: state.connections.filter(
      (connection) =>
        connection.from.componentId !== componentId &&
        connection.to.componentId !== componentId
    ),
    wireStart:
      state.wireStart?.componentId === componentId ? null : state.wireStart,
  };
}

export function deleteSelectedComponents(state) {
  const selected = state.selectedComponents?.length
    ? state.selectedComponents
    : state.selectedComponent
      ? [state.selectedComponent]
      : [];
  if (!selected.length) return state;

  const deleted = new Set(selected);
  return {
    ...state,
    selectedComponent: null,
    selectedComponents: [],
    selectedConnection: null,
    inspectorOpen: false,
    deletedComponents: [
      ...state.deletedComponents,
      ...selected.filter((id) => !state.deletedComponents.includes(id)),
    ],
    connections: state.connections.filter(
      (connection) =>
        !deleted.has(connection.from.componentId) &&
        !deleted.has(connection.to.componentId)
    ),
    wireStart:
      state.wireStart && deleted.has(state.wireStart.componentId) ? null : state.wireStart,
  };
}

export function selectComponents(state, componentIds) {
  const ids = [...new Set(componentIds)].filter((id) => state.positions?.[id]);
  return {
    ...state,
    selectedComponent: ids[ids.length - 1] ?? null,
    selectedComponents: ids,
    inspectorOpen: ids.length === 1,
  };
}

export function clearSelection(state) {
  if (!state.selectedComponent && !(state.selectedComponents || []).length && !state.inspectorOpen) return state;
  return {
    ...state,
    selectedComponent: null,
    selectedComponents: [],
    inspectorOpen: false,
  };
}

export function startPlacement(state, kind) {
  if (!DESIGN_LAB_LIBRARY.some((item) => item.kind === kind)) return state;
  return { ...state, placementKind: kind, libraryOpen: true };
}

export function placeComponent(state, x, y) {
  const definition = DESIGN_LAB_LIBRARY.find((item) => item.kind === state.placementKind);
  if (!definition) return state;

  const prefix = definition.kind === "source" ? "V" : definition.kind === "resistor" ? "R" : "C";
  const usedIds = new Set(Object.keys(state.positions || {}));
  let index = 1;
  while (usedIds.has(prefix + index)) index += 1;
  const id = prefix + index;

  return {
    ...state,
    placementKind: null,
    libraryOpen: false,
    selectedComponent: id,
    selectedComponents: [id],
    inspectorOpen: true,
    positions: {
      ...state.positions,
      [id]: {
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(8, Math.min(92, y)),
      },
    },
    placedComponents: [
      ...state.placedComponents,
      { id, ...definition },
    ],
    values: {
      ...state.values,
      [id]: definition.value,
    },
    rotations: {
      ...state.rotations,
      [id]: 0,
    },
  };
}

export function duplicateSelectedComponents(state) {
  const selected = state.selectedComponents?.length
    ? state.selectedComponents
    : state.selectedComponent
      ? [state.selectedComponent]
      : [];
  const sourceIds = selected.filter((id) => state.positions?.[id]);
  if (!sourceIds.length) return state;

  const usedIds = new Set(Object.keys(state.positions || {}));
  const nextIdFor = (component) => {
    const prefix = component.kind === "source" ? "V" : component.kind === "resistor" ? "R" : "C";
    let index = 1;
    while (usedIds.has(prefix + index)) index += 1;
    const id = prefix + index;
    usedIds.add(id);
    return id;
  };

  const sourceComponents = sourceIds.map((id) =>
    [...DESIGN_LAB_COMPONENTS, ...state.placedComponents].find((component) => component.id === id)
  ).filter(Boolean);

  const idMap = {};
  const newPositions = { ...state.positions };
  const newValues = { ...state.values };
  const newRotations = { ...state.rotations };
  const newPlacedComponents = [...state.placedComponents];

  sourceComponents.forEach((component) => {
    const nextId = nextIdFor(component);
    idMap[component.id] = nextId;
    const position = state.positions[component.id];
    newPositions[nextId] = {
      x: Math.max(5, Math.min(95, position.x + 6)),
      y: Math.max(8, Math.min(92, position.y + 6)),
    };
    newValues[nextId] = state.values[component.id] ?? component.value;
    newRotations[nextId] = state.rotations[component.id] || 0;
    newPlacedComponents.push({ ...component, id: nextId });
  });

  const duplicatedConnections = state.connections
    .filter(
      (connection) =>
        idMap[connection.from.componentId] &&
        idMap[connection.to.componentId]
    )
    .map((connection, index) => ({
      id: `${idMap[connection.from.componentId]}-${connection.from.side}-${idMap[connection.to.componentId]}-${connection.to.side}-${state.connections.length + index + 1}`,
      from: {
        ...connection.from,
        componentId: idMap[connection.from.componentId],
      },
      to: {
        ...connection.to,
        componentId: idMap[connection.to.componentId],
      },
    }));

  return {
    ...state,
    positions: newPositions,
    values: newValues,
    rotations: newRotations,
    placedComponents: newPlacedComponents,
    connections: [...state.connections, ...duplicatedConnections],
    selectedComponent: idMap[sourceIds[sourceIds.length - 1]],
    selectedComponents: sourceIds.map((id) => idMap[id]),
    inspectorOpen: sourceIds.length === 1,
  };
}

export function rotateComponent(state, componentId) {
  if (!state.positions?.[componentId]) return state;
  return {
    ...state,
    rotations: {
      ...state.rotations,
      [componentId]: ((state.rotations?.[componentId] || 0) + 90) % 360,
    },
  };
}

export function updateComponentValue(state, componentId, value) {
  if (!state.positions?.[componentId] || typeof value !== "string") return state;
  if (state.values?.[componentId] === value) return state;
  return {
    ...state,
    values: {
      ...state.values,
      [componentId]: value,
    },
  };
}

export function setTool(state, tool) {
  if (!["select", "wire", "pan"].includes(tool)) return state;
  return { ...state, tool, wireStart: null };
}

export function selectConnection(state, connectionId) {
  if (!connectionId) return { ...state, selectedConnection: null };
  return {
    ...state,
    selectedConnection: connectionId,
    selectedComponent: null,
    selectedComponents: [],
    inspectorOpen: false,
  };
}

export function deleteSelectedConnection(state) {
  if (!state.selectedConnection) return state;
  return {
    ...state,
    connections: state.connections.filter((connection) => connection.id !== state.selectedConnection),
    selectedConnection: null,
  };
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
        id: `${start.componentId}-${start.side}-${componentId}-${side}-${state.connections.length + 1}`,
        from: start,
        to: { componentId, side },
      },
    ],
  };
}

export function selectComponent(state, componentId, additive = false) {
  if (componentId === null) return clearSelection(state);
  if (!state.positions?.[componentId]) return state;
  const current = state.selectedComponents || [];
  const selectedComponents = additive
    ? current.includes(componentId)
      ? current.filter((id) => id !== componentId)
      : [...current, componentId]
    : [componentId];

  return {
    ...state,
    selectedComponent: selectedComponents[selectedComponents.length - 1] ?? null,
    selectedComponents,
    inspectorOpen: selectedComponents.length === 1,
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
  const anchor = state.positions[componentId];
  return moveComponentsByDelta(state, [componentId], x - anchor.x, y - anchor.y);
}

export function moveComponentsByDelta(state, componentIds, dx, dy) {
  const ids = componentIds.filter((id) => state.positions?.[id]);
  if (!ids.length || (dx === 0 && dy === 0)) return state;
  return {
    ...state,
    positions: {
      ...state.positions,
      ...Object.fromEntries(
        ids.map((id) => {
          const position = state.positions[id];
          return [id, {
            x: Math.max(5, Math.min(95, position.x + dx)),
            y: Math.max(8, Math.min(92, position.y + dy)),
          }];
        })
      ),
    },
  };
}

export function alignSelectedComponents(state, axis) {
  const ids = state.selectedComponents?.length ? state.selectedComponents : [];
  if (ids.length < 2 || !["x", "y"].includes(axis)) return state;
  const values = ids.map((id) => state.positions[id]?.[axis]).filter(Number.isFinite);
  if (values.length !== ids.length) return state;
  const target = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    ...state,
    positions: {
      ...state.positions,
      ...Object.fromEntries(ids.map((id) => [id, {
        ...state.positions[id],
        [axis]: snapCoordinate(target, state.gridSize),
      }])),
    },
  };
}

export function distributeSelectedComponents(state, axis) {
  const ids = state.selectedComponents?.length ? state.selectedComponents : [];
  if (ids.length < 3 || !["x", "y"].includes(axis)) return state;
  const sorted = [...ids].sort((a, b) => state.positions[a][axis] - state.positions[b][axis]);
  const first = state.positions[sorted[0]][axis];
  const last = state.positions[sorted[sorted.length - 1]][axis];
  const step = (last - first) / (sorted.length - 1);
  return {
    ...state,
    positions: {
      ...state.positions,
      ...Object.fromEntries(sorted.map((id, index) => [id, {
        ...state.positions[id],
        [axis]: snapCoordinate(first + step * index, state.gridSize),
      }])),
    },
  };
}

export function nudgeSelectedComponents(state, dx, dy) {
  const ids = state.selectedComponents?.length
    ? state.selectedComponents
    : state.selectedComponent
      ? [state.selectedComponent]
      : [];
  if (!ids.length) return state;
  const step = state.gridEnabled ? state.gridSize : 1;
  return moveComponentsByDelta(state, ids, dx * step, dy * step);
}

export function moveComponentsFromSnapshot(state, startPositions, dx, dy) {
  const ids = Object.keys(startPositions || {}).filter((id) => state.positions?.[id]);
  if (!ids.length) return state;
  return {
    ...state,
    positions: {
      ...state.positions,
      ...Object.fromEntries(
        ids.map((id) => {
          const start = startPositions[id];
          const raw = {
            x: Math.max(5, Math.min(95, start.x + dx)),
            y: Math.max(8, Math.min(92, start.y + dy)),
          };
          return [id, snapPosition(raw, state.gridEnabled, state.gridSize)];
        })
      ),
    },
  };
}


export function toggleGrid(state) {
  return { ...state, gridEnabled: !state.gridEnabled };
}

export function snapCoordinate(value, gridSize = 2) {
  if (!Number.isFinite(value)) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function snapPosition(position, gridEnabled, gridSize = 2) {
  if (!position || !gridEnabled) return position;
  return {
    x: snapCoordinate(position.x, gridSize),
    y: snapCoordinate(position.y, gridSize),
  };
}
