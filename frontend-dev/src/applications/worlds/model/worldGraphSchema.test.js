import test from "node:test";
import assert from "node:assert/strict";

import { validateWorldGraphSchema } from "./worldGraphSchema.js";
import { seriesCircuitFixture } from "./__fixtures__/worldGraphFixtures.js";


test("valid canonical series graph passes schema validation", () => {
  const graph = seriesCircuitFixture();
  assert.equal(validateWorldGraphSchema(graph.nodes, graph.edges), true);
});


test("schema rejects duplicate node ids", () => {
  const graph = seriesCircuitFixture();
  graph.nodes.push({ ...graph.nodes[0] });
  assert.throws(() => validateWorldGraphSchema(graph.nodes, graph.edges), /duplicates node id/);
});


test("schema rejects missing node references", () => {
  const graph = seriesCircuitFixture();
  graph.edges[0] = { ...graph.edges[0], target: "missing" };
  assert.throws(() => validateWorldGraphSchema(graph.nodes, graph.edges), /references missing node/);
});


test("schema rejects invalid component terminals", () => {
  const graph = seriesCircuitFixture();
  graph.edges[0] = { ...graph.edges[0], sourceHandle: "invalid" };
  assert.throws(() => validateWorldGraphSchema(graph.nodes, graph.edges), /references invalid terminal/);
});


test("schema accepts junction topology with canonical junction handles", () => {
  const graph = seriesCircuitFixture();
  graph.nodes.push({
    id: "J1",
    type: "junction",
    position: { x: 200, y: 200 },
  });
  graph.edges.push({
    id: "e4",
    source: "J1",
    sourceHandle: "junction-top",
    target: "GND1",
    targetHandle: "g",
  });
  assert.equal(validateWorldGraphSchema(graph.nodes, graph.edges), true);
});
