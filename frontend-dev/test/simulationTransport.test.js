import test from "node:test";
import assert from "node:assert/strict";

import { buildSimulationRequest, normalizeSimulationResponse } from "../src/applications/worlds/model/simulationTransport.js";

test("buildSimulationRequest keeps serialized circuit and simulation config together", () => {
  const nodes = [{ id: "R1" }];
  const edges = [{ id: "e1" }];
  const config = { analysis: "transient", settings: { start: 0, stop: 1, step: 0.01 } };
  const serialize = (actualNodes, actualEdges) => ({ nodes: actualNodes, edges: actualEdges });

  assert.deepEqual(buildSimulationRequest(nodes, edges, config, serialize), { nodes, edges, simulation: config });
});

test("buildSimulationRequest preserves transient settings without frontend renaming", () => {
  const config = { analysis: "transient", settings: { start: 0, stop: 0.1, step: 0.001 } };
  const payload = buildSimulationRequest([], [], config, () => ({ nodes: [], edges: [] }));
  assert.deepEqual(payload.simulation, config);
});

test("normalizeSimulationResponse indexes component results by stable id", () => {
  const data = { ok: true, components: [{ id: "R1", voltage: [1, 2] }, { id: "C1", voltage: [0, 1] }] };
  const result = normalizeSimulationResponse(data);
  assert.deepEqual(result.components, { R1: data.components[0], C1: data.components[1] });
});

test("normalizeSimulationResponse accepts an already indexed component map", () => {
  const components = { L1: { id: "L1", current: [0, 1] } };
  const result = normalizeSimulationResponse({ ok: true, components });
  assert.strictEqual(result.components, components);
});

test("normalizeSimulationResponse preserves the rest of the transient response", () => {
  const data = { ok: true, analysis: "transient", time: [0, 0.1], components: [] };
  const result = normalizeSimulationResponse(data);
  assert.equal(result.analysis, "transient");
  assert.deepEqual(result.time, [0, 0.1]);
});
