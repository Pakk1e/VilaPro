import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORLD_CONTEXT,
  createWorldContext,
  validateWorldContext,
} from './worldContext.js';

describe('worldContext', () => {
  it('provides the canonical current Electrical circuit context', () => {
    expect(createWorldContext()).toEqual(DEFAULT_WORLD_CONTEXT);
  });

  it('allows context selection without coupling it to the graph', () => {
    expect(createWorldContext({
      worldId: 'thermal',
      layerId: 'continuum',
      representationId: 'field',
    })).toEqual({
      universeId: 'default',
      worldId: 'thermal',
      layerId: 'continuum',
      representationId: 'field',
    });
  });

  it('rejects missing context identity fields', () => {
    expect(() => validateWorldContext(null)).toThrow('World context must be an object.');
    expect(() => validateWorldContext({ ...DEFAULT_WORLD_CONTEXT, layerId: '' }))
      .toThrow('World context layerId is required.');
  });
});
