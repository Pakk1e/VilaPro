import test from "node:test";
import assert from "node:assert/strict";

import {
  describeCircuitBranch,
  describeCircuitNode,
  getCircuitComponent,
  getCircuitNode,
} from "./resultContext.js";

const result = {
  result: {
    circuit_context: {
      nodes: [
        {
          id: "node_1",
          label: "Node 1",
          is_ground: false,
          connections: [
            { instance_id: "V1", instance_name: "Supply", port_id: "p", port_label: "+" },
            { instance_id: "R1", instance_name: "Load", port_id: "p", port_label: "p" },
          ],
        },
        { id: "ground", label: "Ground", is_ground: true, connections: [] },
      ],
      components: [
        { id: "V1", name: "Supply", type: "VoltageSource", ports: {
          p: { node: "node_1", label: "+" },
          n: { node: "ground", label: "-" },
        } },
      ],
      branches: [
        {
          id: "V1",
          name: "Supply",
          type: "VoltageSource",
          positive: { port_id: "p", node: "node_1" },
          negative: { port_id: "n", node: "ground" },
        },
      ],
    },
  },
};

test("circuit context resolves nodes and components by stable ids", () => {
  assert.equal(getCircuitNode(result, "node_1").label, "Node 1");
  assert.equal(getCircuitComponent(result, "V1").name, "Supply");
});

test("node description explains where the electrical node is connected", () => {
  assert.equal(
    describeCircuitNode(result, "node_1"),
    "Node 1 — Supply.+ / Load.p"
  );
  assert.equal(describeCircuitNode(result, "ground"), "Ground");
});

test("branch description resolves the component and terminal direction", () => {
  assert.equal(
    describeCircuitBranch(result, "node_1->ground"),
    "Supply: Node 1 — Supply.+ / Load.p → Ground"
  );
});
