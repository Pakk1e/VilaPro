import test from "node:test";
import assert from "node:assert/strict";

import {
  createDesignLabState,
  selectComponent,
  togglePanel,
  setMode,
} from "../src/applications/worlds/model/electricalDesignLab.js";

test("creates a canvas-first design lab with contextual panels closed", () => {
  const state = createDesignLabState();

  assert.equal(state.mode, "design");
  assert.equal(state.selectedComponent, null);
  assert.equal(state.libraryOpen, false);
  assert.equal(state.inspectorOpen, false);
  assert.equal(state.resultsOpen, false);
});

test("selecting a component opens its contextual inspector without opening the library", () => {
  const state = selectComponent(createDesignLabState(), "R1");

  assert.equal(state.selectedComponent, "R1");
  assert.equal(state.inspectorOpen, true);
  assert.equal(state.libraryOpen, false);
});

test("panel toggles remain independent", () => {
  const state = togglePanel(createDesignLabState(), "library");
  const next = togglePanel(state, "inspector");

  assert.equal(next.libraryOpen, true);
  assert.equal(next.inspectorOpen, true);
  assert.equal(next.resultsOpen, false);
});

test("workspace mode changes preserve the canvas selection", () => {
  const selected = selectComponent(createDesignLabState(), "C1");
  const simulated = setMode(selected, "simulate");

  assert.equal(simulated.mode, "simulate");
  assert.equal(simulated.selectedComponent, "C1");
  assert.equal(simulated.inspectorOpen, true);
});
