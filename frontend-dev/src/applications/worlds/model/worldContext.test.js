import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WORLD_CONTEXT,
  createWorldContext,
  validateWorldContext,
} from './worldContext.js';

test('worldContext provides the canonical current Electrical circuit context', () => {
  assert.deepEqual(createWorldContext(), DEFAULT_WORLD_CONTEXT);
});

test('worldContext allows context selection without coupling it to the graph', () => {
  assert.deepEqual(createWorldContext({
    worldId: 'thermal',
    layerId: 'continuum',
    representationId: 'field',
  }), {
    universeId: 'default',
    worldId: 'thermal',
    layerId: 'continuum',
    representationId: 'field',
  });
});

test('worldContext rejects missing context identity fields', () => {
  assert.throws(
    () => validateWorldContext(null),
    /World context must be an object\./,
  );
  assert.throws(
    () => validateWorldContext({ ...DEFAULT_WORLD_CONTEXT, layerId: '' }),
    /World context layerId is required\./,
  );
});
