import test from "node:test";
import assert from "node:assert/strict";

import {
  acCircuitFixture,
  currentSourceFixture,
  parallelResistorFixture,
  rcCircuitFixture,
  sineSourceFixture,
  seriesCircuitFixture,
} from "./__fixtures__/worldGraphFixtures.js";
import { buildCircuitDescription, serializeWorldGraph, validateWorldGraph } from "./worldGraphSerializer.js";

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
    ports: { n: "ground", p: "node_2" },
  });
  assert.deepEqual(resistor, {
    id: "R1",
    name: "Resistor 1",
    type: "Resistor",
    parameters: { R: 1000 },
    ports: { p: "node_2", n: "ground" },
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

test("AC fixture preserves periodic source semantics including phase", () => {
  const graph = acCircuitFixture();
  const voltage = instancesFor(graph).find((instance) => instance.id === "V1");

  assert.deepEqual(voltage.parameters.V, {
    waveform: "sine",
    amplitude: 5,
    offset: 0,
    frequency: 1000,
    phase: Math.PI / 2,
    delay: 0,
  });
});

test("RC fixture preserves capacitor identity and electrical topology", () => {
  const graph = rcCircuitFixture();
  const instances = instancesFor(graph);
  const capacitor = instances.find((instance) => instance.id === "C1");

  assert.equal(instances.length, 3);
  assert.deepEqual(capacitor, {
    id: "C1",
    name: "Capacitor 1",
    type: "Capacitor",
    parameters: { C: 0.001 },
    ports: { p: "node_3", n: "ground" },
  });
});

test("current source fixture maps current into the backend source parameter", () => {
  const graph = currentSourceFixture();
  const source = instancesFor(graph).find((instance) => instance.id === "I1");

  assert.deepEqual(source, {
    id: "I1",
    name: "Current Source 1",
    type: "CurrentSource",
    parameters: { I: 0.01 },
    ports: { n: "ground", p: "node_2" },
  });
});

test("parallel resistor fixture preserves junction connectivity", () => {
  const graph = parallelResistorFixture();
  assert.equal(validateWorldGraph(graph.nodes, graph.edges), undefined);

  const instances = instancesFor(graph);
  const resistorA = instances.find((instance) => instance.id === "R1");
  const resistorB = instances.find((instance) => instance.id === "R2");

  assert.equal(resistorA.ports.p, resistorB.ports.p);
  assert.equal(resistorA.ports.n, "ground");
  assert.equal(resistorB.ports.n, "ground");
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

test("duplicate node identities are rejected at the graph boundary", () => {
  const graph = seriesCircuitFixture();
  graph.nodes[1] = { ...graph.nodes[1], id: "V1" };

  assert.throws(
    () => validateWorldGraph(graph.nodes, graph.edges),
    /duplicates node id/
  );
});

test("wires referencing deleted nodes are rejected at the graph boundary", () => {
  const graph = seriesCircuitFixture();
  graph.nodes = graph.nodes.filter((node) => node.id !== "R1");

  assert.throws(
    () => validateWorldGraph(graph.nodes, graph.edges),
    /references missing node/
  );
});
