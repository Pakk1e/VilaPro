import test from "node:test";
import assert from "node:assert/strict";

import { WORLD_EXAMPLES } from "./worldExamples.js";
import { validateWorldGraphSchema } from "./worldGraphSchema.js";
import { buildCircuitDescription } from "./worldGraphSerializer.js";


test("electrical examples expose stable, complete graphs", () => {
  assert.deepEqual(WORLD_EXAMPLES.map((example) => example.id), [
    "voltage-divider",
    "rc-low-pass",
    "parallel-resistors",
    "rl-transient",
    "rlc-transient",
  ]);

  for (const example of WORLD_EXAMPLES) {
    const graph = example.createGraph();
    assert.equal(validateWorldGraphSchema(graph.nodes, graph.edges), true);
    assert.ok(graph.nodes.length > 0);
    assert.ok(graph.edges.length > 0);
    assert.equal(graph.nodes.filter((node) => node.data?.componentType === "Ground").length, 1);
    assert.doesNotThrow(() => buildCircuitDescription(graph.nodes, graph.edges));
  }
});


test("electrical examples create independent graph instances", () => {
  const first = WORLD_EXAMPLES[0].createGraph();
  const second = WORLD_EXAMPLES[0].createGraph();
  first.nodes[0].position.x = 9999;
  first.nodes[0].data.properties.voltage = 1;

  assert.equal(second.nodes[0].position.x, 80);
  assert.equal(second.nodes[0].data.properties.voltage, 10);
});


test("electrical examples expose an explicit simulation preset", () => {
  assert.deepEqual(
    WORLD_EXAMPLES.map((example) => ({ id: example.id, ...example.simulationPreset })),
    [
      { id: "voltage-divider", analysis: "dc_operating_point", settings: {} },
      { id: "rc-low-pass", analysis: "transient", settings: { start: 0, stop: 0.005, step: 0.00001 } },
      { id: "parallel-resistors", analysis: "dc_operating_point", settings: {} },
      { id: "rl-transient", analysis: "transient", settings: { start: 0, stop: 0.00005, step: 0.0000001 } },
      { id: "rlc-transient", analysis: "transient", settings: { start: 0, stop: 0.005, step: 0.000005 } },
    ]
  );

  for (const example of WORLD_EXAMPLES) {
    assert.ok(Object.isFrozen(example.simulationPreset));
    assert.ok(Object.isFrozen(example.simulationPreset.settings));
  }
});


test("RL transient example exposes the canonical dynamic component parameters", () => {
  const example = WORLD_EXAMPLES.find((candidate) => candidate.id === "rl-transient");
  assert.ok(example);
  const graph = example.createGraph();
  const inductor = graph.nodes.find((node) => node.data?.componentType === "Inductor");

  assert.ok(inductor);
  assert.deepEqual(inductor.data.properties, {
    inductance: 0.01,
    initialCurrent: 0,
  });
  assert.equal(
    graph.edges.some(
      (edge) => edge.source === "R1" && edge.target === "L1" && edge.sourceHandle === "n" && edge.targetHandle === "p"
    ),
    true
  );
  assert.doesNotThrow(() => buildCircuitDescription(graph.nodes, graph.edges));
});


test("RLC transient example exposes both dynamic components", () => {
  const example = WORLD_EXAMPLES.find((candidate) => candidate.id === "rlc-transient");
  assert.ok(example);
  const graph = example.createGraph();
  const inductor = graph.nodes.find((node) => node.data?.componentType === "Inductor");
  const capacitor = graph.nodes.find((node) => node.data?.componentType === "Capacitor");

  assert.ok(inductor);
  assert.ok(capacitor);
  assert.equal(inductor.data.properties.inductance, 0.01);
  assert.equal(inductor.data.properties.initialCurrent, 0);
  assert.equal(capacitor.data.properties.capacitance, 0.000001);
  assert.equal(capacitor.data.properties.initialVoltage, 0);
  assert.equal(
    graph.edges.some(
      (edge) => edge.source === "L1" && edge.target === "C1" && edge.sourceHandle === "n" && edge.targetHandle === "p"
    ),
    true
  );
  assert.doesNotThrow(() => buildCircuitDescription(graph.nodes, graph.edges));
});
