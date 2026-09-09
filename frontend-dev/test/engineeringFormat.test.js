import test from "node:test";
import assert from "node:assert/strict";

import { formatEngineeringTick, formatEngineeringValue, getEngineeringScale } from "../src/applications/worlds/model/engineeringFormat.js";

test("formats small currents with an appropriate engineering prefix", () => {
  assert.equal(formatEngineeringValue(0.00000042, "A"), "0.42 µA");
  assert.equal(formatEngineeringValue(-0.00000042, "A"), "-0.42 µA");
});

test("keeps ordinary electrical values readable", () => {
  assert.equal(formatEngineeringValue(0.12, "A"), "120 mA");
  assert.equal(formatEngineeringValue(12, "V"), "12.0 V");
  assert.equal(formatEngineeringValue(0, "A"), "0 A");
});

test("uses one scale for a result series and its axis ticks", () => {
  const scale = { ...getEngineeringScale([-0.00000042, 0, 0.00000042], "A"), baseUnit: "A" };
  assert.equal(scale.symbol, "µA");
  assert.equal(formatEngineeringTick(-0.00000042, "A", scale), "-0.42");
  assert.equal(formatEngineeringTick(0.00000042, "A", scale), "0.42");
});

test("supports pico-unit values without rounding them to zero", () => {
  assert.equal(formatEngineeringValue(0.00000000000042, "A"), "0.42 pA");
});
