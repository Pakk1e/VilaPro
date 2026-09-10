import test from "node:test";
import assert from "node:assert/strict";

import { buildLiveSimulationRequest, normalizeLiveSnapshot } from "./simulationTransport.js";

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

test("live snapshot normalization protects signal access", () => {
  const snapshot = normalizeLiveSnapshot({
    session_id: "abc",
    status: "running",
    signals: { "V(out)": 5 },
  });

  assert.deepEqual(snapshot.signals, { "V(out)": 5 });
  assert.notEqual(snapshot.signals, undefined);
});
