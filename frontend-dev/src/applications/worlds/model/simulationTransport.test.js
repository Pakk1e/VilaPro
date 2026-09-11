import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLiveSimulationRequest,
  buildSimulationRequest,
  normalizeLiveSnapshot,
  normalizeSimulationResponse,
  validateLiveSnapshot,
  validateSimulationRequest,
  validateSimulationResponse,
} from "./simulationTransport.js";

test("live simulation request forces live execution mode", () => {
  const request = buildLiveSimulationRequest(
    [{ id: "n1" }],
    [],
    { mode: "static", analysis: "dc_operating_point", settings: {}, outputs: [] },
    (nodes, edges) => ({ world_source: "world", instances: nodes, edges })
  );

  assert.equal(request.simulation.mode, "live");
  assert.equal(request.simulation.analysis, "dc_operating_point");
});

test("static simulation request validates the public request shape", () => {
  const request = buildSimulationRequest(
    [],
    [],
    { mode: "static", analysis: "transient", settings: {}, outputs: [] },
    () => ({ world_source: "world", instances: [] })
  );

  assert.equal(validateSimulationRequest(request), true);
});

test("simulation request validation rejects missing world source", () => {
  assert.throws(
    () => validateSimulationRequest({ world_source: "", instances: [], simulation: { mode: "static", analysis: "ac", settings: {}, outputs: [] } }),
    /world_source must be a non-empty string/
  );
});

test("simulation response normalization validates the public response shape", () => {
  const response = {
    ok: true,
    analysis: "dc_operating_point",
    status: "completed",
    node_voltages: { ground: 0 },
    branch_currents: {},
    components: [{ id: "R1", name: "R1" }],
    result: { data: {} },
    visualization: null,
  };

  assert.equal(validateSimulationResponse(response), true);
  assert.deepEqual(normalizeSimulationResponse(response).components, { R1: { id: "R1", name: "R1" } });
});

test("simulation response validation rejects malformed component results", () => {
  assert.throws(
    () => validateSimulationResponse({
      ok: true,
      analysis: "dc_operating_point",
      status: "completed",
      node_voltages: {},
      branch_currents: {},
      components: {},
      result: {},
    }),
    /components must be an array/
  );
});

test("live snapshot normalization protects signal access", () => {
  const snapshot = normalizeLiveSnapshot({
    ok: true,
    session_id: "abc",
    analysis: "dc_operating_point",
    mode: "live",
    status: "running",
    independent_value: 0,
    signals: { "V(out)": 5 },
    error: null,
  });

  assert.deepEqual(snapshot.signals, { "V(out)": 5 });
  assert.notEqual(snapshot.signals, undefined);
});

test("live snapshot validation rejects missing session identity", () => {
  assert.throws(
    () => validateLiveSnapshot({ ok: true, analysis: "ac", mode: "live", status: "running", signals: {} }),
    /session_id must be a non-empty string/
  );
});
