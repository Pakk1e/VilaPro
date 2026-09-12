import test from "node:test";
import assert from "node:assert/strict";

import { getLiveSimulationRate, interpolateLiveSimulationTime } from "./liveSimulationTiming.js";

test("live timing derives AC simulation speed from server snapshots", () => {
  assert.ok(Math.abs(getLiveSimulationRate({
    analysis: "ac",
    frequency: 1000,
    previousTime: 0.00005,
    previousWallTime: 1000,
    currentTime: 0.0001,
    currentWallTime: 1050,
  }) - 0.001) < 1e-12);
});

test("live timing falls back to AC speed when there is no previous snapshot", () => {
  assert.ok(Math.abs(getLiveSimulationRate({ analysis: "ac", frequency: 2000 }) - 0.0005) < 1e-12);
});

test("live timing keeps non-AC simulation at one simulated second per wall-clock second by default", () => {
  assert.equal(getLiveSimulationRate({ analysis: "transient" }), 1);
});

test("live timing uses measured snapshot timing when available", () => {
  assert.equal(getLiveSimulationRate({
    analysis: "transient",
    previousTime: 0.5,
    previousWallTime: 1000,
    currentTime: 0.75,
    currentWallTime: 1500,
  }), 0.5);
});

test("live timing interpolates simulation time without changing the configured rate", () => {
  assert.equal(interpolateLiveSimulationTime({
    anchorTime: 0.001,
    anchorWallTime: 1000,
    wallTime: 1500,
    rate: 0.001,
  }), 0.0015);
});

test("live timing rejects invalid interpolation rates", () => {
  assert.equal(interpolateLiveSimulationTime({ anchorTime: 1, anchorWallTime: 1000, wallTime: 1100, rate: -1 }), 1);
  assert.equal(interpolateLiveSimulationTime({ anchorTime: 1, anchorWallTime: 1000, wallTime: 1100, rate: Number.NaN }), 1);
});
