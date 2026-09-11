export const DEFAULT_WORLD_CONTEXT = Object.freeze({
  universeId: 'default',
  worldId: 'electrical',
  layerId: 'circuit',
  representationId: 'schematic',
});

export function createWorldContext(overrides = {}) {
  return Object.freeze({
    ...DEFAULT_WORLD_CONTEXT,
    ...overrides,
  });
}

export function validateWorldContext(context) {
  if (!context || typeof context !== 'object') {
    throw new Error('World context must be an object.');
  }

  for (const field of ['universeId', 'worldId', 'layerId', 'representationId']) {
    if (typeof context[field] !== 'string' || !context[field].trim()) {
      throw new Error(`World context ${field} is required.`);
    }
  }

  return context;
}
