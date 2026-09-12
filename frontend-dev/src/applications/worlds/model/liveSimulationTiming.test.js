import { describe, expect, it } from "vitest";
import { getLiveSimulationRate, interpolateLiveSimulationTime } from "./liveSimulationTiming";

describe("liveSimulationTiming", () => {
  it("derives AC simulation speed from the server snapshots", () => {
    expect(getLiveSimulationRate({
      analysis: "ac",
      frequency: 1000,
      previousTime: 0.00005,
      previousWallTime: 1000,
      currentTime: 0.0001,
      currentWallTime: 1050,
    })).toBeCloseTo(0.001);
  });

  it("falls back to the AC speed when there is no previous snapshot", () => {
    expect(getLiveSimulationRate({ analysis: "ac", frequency: 2000 })).toBeCloseTo(0.0005);
  });

  it("keeps non-AC live simulation at one simulated second per wall-clock second by default", () => {
    expect(getLiveSimulationRate({ analysis: "transient" })).toBe(1);
  });

  it("uses measured snapshot timing when it is available", () => {
    expect(getLiveSimulationRate({
      analysis: "transient",
      previousTime: 0.5,
      previousWallTime: 1000,
      currentTime: 0.75,
      currentWallTime: 1500,
    })).toBeCloseTo(0.5);
  });

  it("interpolates simulation time without changing the configured rate", () => {
    expect(interpolateLiveSimulationTime({
      anchorTime: 0.001,
      anchorWallTime: 1000,
      wallTime: 1500,
      rate: 0.001,
    })).toBeCloseTo(0.0015);
  });

  it("does not extrapolate backwards or with invalid timing", () => {
    expect(interpolateLiveSimulationTime({
      anchorTime: 1,
      anchorWallTime: 1000,
      wallTime: 500,
      rate: 1,
    })).toBeCloseTo(0.5);
    expect(interpolateLiveSimulationTime({ anchorTime: 1, anchorWallTime: 1000, wallTime: 1100, rate: -1 })).toBe(1);
  });
});
