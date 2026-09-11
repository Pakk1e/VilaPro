import test from "node:test";
import assert from "node:assert/strict";

import { sineSourceFixture, seriesCircuitFixture } from "./__fixtures__/worldGraphFixtures.js";
import { buildCircuitDescription, serializeWorldGraph } from "./worldGraphSerializer.js";

function instancesFor(graph) {
  return buildCircuitDescription(graph.nodes, graph.edges).instances;
}

test("series circuit fixture serializes topology and parameters deterministically", () => {
  const graph = seriesCircuitFixture();
  const first = serializeWorldGraph(graph.nodes, graph.edges);
  const second = serializeWorldGraph(graph.nodes, graph.edges);

  assert.deepEqual(first, second);
  assert.equal(first.instances.length, 2);

  const voltage = first.instances.find((instance) => instance.id === "V1");
  const resistor = first.instances.find((instance) => instance.id === "R1");
  assert.deepEqual(voltage, {
    id: "V1",
    name: "Voltage Source 1",
    type: "VoltageSource",
    parameters: { V: 10 },
    ports: { n: "ground", p: "node_1" },
  });
  assert.deepEqual(resistor, {
    id: "R1",
    name: "Resistor 1",
    type: "Resistor",
    parameters: { R: 1000 },
    ports: { p: "node_1", n: "ground" },
  });
});

test("sine source fixture preserves waveform semantics at the serializer boundary", () => {
  const graph = sineSourceFixture();
  const voltage = instancesFor(graph).find((instance) => instance.id === "V1");

  assert.deepEqual(voltage.parameters.V, {
    waveform: "sine",
    amplitude: 5,
    offset: 0,
    frequency: 1,
    phase: 0,
    delay: 0,
  });
});

test("invalid wire endpoints are rejected before simulation serialization", () => {
  const graph = seriesCircuitFixture();
  graph.edges[0] = { ...graph.edges[0], targetHandle: "missing" };

  assert.throws(
    () => serializeWorldGraph(graph.nodes, graph.edges),
    /invalid terminal/
  );
});

test("missing ground is rejected", () => {
  const graph = seriesCircuitFixture();
  graph.nodes = graph.nodes.filter((node) => node.data.componentType !== "Ground");

  assert.throws(
    () => serializeWorldGraph(graph.nodes, graph.edges),
    /Ground is required/
  );
});

test("unconnected component terminals are rejected", () => {
  const graph = seriesCircuitFixture();
  graph.edges = graph.edges.slice(0, 2);

  assert.throws(
    () => serializeWorldGraph(graph.nodes, graph.edges),
    /terminal "n" is unconnected/
  );
});
