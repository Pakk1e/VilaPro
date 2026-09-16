# Lab OS Current Status

## Purpose

This document is the handoff point for future development sessions. It describes the current engineering direction and what should be considered established before starting new work.

## Current project direction

Lab OS is a learning-focused interactive sandbox. The current implementation is the Electrical World and its circuit simulation workspace.

The long-term architecture supports multiple Worlds and multiple meaningful abstraction Layers. A future Layer may replace the current UI entirely and may use an independent simulation model.

The current frontend is in a deliberate UI rework. The rework is a presentation/interaction replacement, not a replacement of the World Graph, serializer, simulation backend, or simulation transport. The target direction is documented in `docs/UI_REWORK.md` and the current visual iteration in `docs/UI_REWORK_V2.md`.

## Established engineering foundation

The Worlds workspace currently has explicit boundaries between:

- visual/editor state
- canonical World Graph
- graph serialization
- backend simulation model
- simulation execution
- runtime transport
- result/visualization model
- renderer/layout
- explicit World/Layer/Representation session context

The current World Graph and public simulation transport boundaries have runtime validation and deterministic tests. Backend domain/model validation remains authoritative for physics, component semantics, and numerical correctness.

The frontend supports both static and live simulation concepts. The Live workspace includes oscilloscope-oriented visualization for sampled signals. The schematic preview remains intentionally clean: simulation telemetry is not painted as persistent value boxes or current-direction arrows over component symbols. Result selection still provides a contextual schematic highlight when a result is selected.

The current Electrical workspace carries an explicit, minimal context identity (`universeId`, `worldId`, `layerId`, `representationId`) without coupling that context to the World Graph or changing the Electrical simulation model. This is an extension point for future Worlds/Layers, not a multi-world implementation.

The Electrical workspace has deterministic pre-created examples represented as editable World Graph templates. Current examples are Voltage divider, RC low-pass, Parallel resistors, RL transient, RLC transient, Diode rectifier, NPN transistor bias, NPN low-side switch, PNP transistor high-side switch, NMOS low-side switch, PMOS high-side switch, and CMOS inverter. Examples are graph templates, not separate simulation engines; they exercise the same editor, serializer, backend, and analysis paths as user-built circuits.

Electrical examples also carry explicit simulation presets in the example model. Static examples declare DC operating point; dynamic examples declare transient analysis with bounded, example-specific time ranges. The palette exposes the intended analysis, and loading an example applies that preset to the Simulation workspace through a tested configuration boundary.

## Simulation capabilities

The static analysis set now includes:

- DC operating point
- DC parameter sweep
- transient analysis
- single-frequency AC analysis
- frequency sweep / frequency-response analysis

Frequency Sweep is a dedicated analysis rather than a special case of DC sweep. It runs the existing AC solver at each requested frequency and stores a generic result with a frequency axis, point status, node-voltage magnitudes, branch-current magnitudes, and component V/I magnitudes. The frontend exposes start/stop/step frequency plus excitation amplitude and phase. The result plot uses Frequency (Hz) as its independent axis and is intended for RLC resonance/filter response work.

The semiconductor component set now includes a Diode, NPN BJT, PNP BJT, NMOS, and PMOS. The Diode uses forward voltage (`Vf`) and on-resistance (`Ron`) in a piecewise-linear active-set model. BJTs use `Vbe`, `VceSat`, and `Beta` with cutoff, forward-active, and saturation regions. The NPN/PNP network implementation supports three terminals with independent base/collector branches and derives emitter current from KCL.

NMOS and PMOS are represented as three-terminal enhancement MOSFET switch models with G/D/S ports and `Vth` plus `RdsOn` parameters. Their large-signal model is intentionally useful and bounded: gate current is idealized as zero; below threshold the channel is open, while above threshold it behaves as `RdsOn`. The network layer therefore supports multiple MOSFETs simultaneously, which enables complementary circuits.

A CMOS inverter is now a real editable example built from one PMOS and one NMOS sharing the input gate and output drain node. CMOS is deliberately modeled as a circuit/technology example rather than as a separate transistor type. The current MOSFET model does not yet include body effect, capacitances, channel-length modulation, detailed saturation equations, or a small-signal AC representation; AC/frequency-domain operation explicitly rejects nonlinear BJT/MOSFET models until those representations are introduced.

## UI rework direction

The Electrical frontend is being rebuilt around a schematic-first workbench informed by EveryCircuit, KiCad, LTspice, CircuitLab, Falstad/CircuitJS, Multisim Live, EasyEDA, Qucs-S, Altium, and Tinkercad Circuits.

The first UI rework established four contextual surfaces:

1. Component Library
2. Schematic Canvas
3. Inspector
4. Instrument Panel

The V2 visual direction explicitly rejects a dashboard composition in which these surfaces permanently occupy equal-weight regions. The schematic must own the screen; secondary tools orbit it and appear contextually.

### Active correction: interaction redesign

The previous V2 shell is considered **infrastructure, not the finished rework**. It redistributed the existing UI into hideable/resizable surfaces but did not sufficiently change how the user works. The active phase therefore replaces the panel-oriented mental model with an action-first workbench.

Current design rules:

- the circuit owns the screen
- the top bar provides orientation and mode, not application-panel navigation
- Add/Place is a temporary canvas tool rather than a persistent palette concept
- selection is the entry point to inspection
- measurement starts from a node, terminal, or component and produces an identified instrument trace
- Build and Simulate are workspace modes, not separate dashboards
- analysis controls are progressively disclosed
- instruments appear around meaningful results and give space back to the schematic when dismissed
- visual inspection is a release gate alongside automated acceptance

The interaction redesign now has a real direct-placement path: choosing a component from the Component Library closes the tool and enters a temporary placement state; the selected engineering symbol follows the pointer as a placement preview; clicking the schematic places the instance on a snapped canvas position; Escape cancels placement. The legacy `worlds:add-component` event remains available for deterministic compatibility and example/test setup, while normal user insertion uses the placement boundary. This is the first material change to the way the canvas is used rather than a panel-only restyle.

The visual direction still needs further work: the schematic symbols, object-local inspection, wiring feedback, simulation mode treatment, and instrument presentation must be refined until the workspace no longer reads as a collection of application panels.

The target visual language is technical, calm, and restrained rather than card-heavy or dashboard-like. Stable viewport behavior is a requirement: placing/editing components must not unexpectedly zoom or move the circuit; fit-to-content is an explicit action.

## Important architectural rules

1. Do not make the renderer the source of physical/simulation truth.
2. Do not make ReactFlow/editor structures the backend simulation model.
3. Keep topology semantic; screen coordinates are presentation.
4. Keep component definitions separate from component instances.
5. Keep analysis separate from execution mode.
6. Keep static and live result/runtime boundaries explicit.
7. Keep World/Layer context separate from domain graph semantics.
8. Validate boundaries with useful errors.
9. Prefer deterministic model fixtures over browser-only setup.
10. Use targeted visual checks rather than broad fragile screenshots.
11. Diagnose from model → serializer → backend → transport → visualization → renderer → browser/CSS.
12. Run the complete relevant test/deploy/acceptance pipeline before reporting a change as successful.

## Product/vision rules

1. The primary purpose is learning electronics.
2. The default experience is a sandbox, not a tutor.
3. Pre-created examples are important.
4. UI/UX is Layer-specific; there is no requirement for one universal UI.
5. Higher-level simulations do not recursively simulate lower levels.
6. Components can have different numbers of meaningful representations.
7. Downward navigation requires an established lower representation.
8. Upward navigation requires an established parent representation.
9. Canonical foundations remain recoverable after experimentation.
10. Physics and mathematics should remain meaningful.
11. User-created components and representations are long-term goals.
12. Cross-world relationships may eventually exist, but their exact architecture is intentionally undecided.

## Immediate engineering priority

Continue `docs/UI_REWORK_V2.md` as the active frontend presentation direction. Do not merely polish the first dashboard-like composition. The current implementation has the canvas-first shell, compact searchable Component Library, contextual Inspector, schematic symbols, Simulation/Instrument Panel, probe mapping, focus mode, and focused UI acceptance coverage. The latest refinement also removed a non-functional canvas control and tightened schematic component presentation.

The **active V2.5 Interaction Redesign** must now continue from the new action-first direction. Direct component placement is now implemented as a temporary canvas tool; next work should materially improve object-local inspection, wiring interaction, Build/Simulate mode treatment, and instrument presentation rather than reverting to panel dimensions/colors.

Simulation-model work should continue independently when concrete electrical examples require it, including future semiconductor behavior and small-signal representations.

## Validation state

The pre-created Electrical examples have real-backend browser acceptance coverage where appropriate. Dynamic examples verify their bounded simulation presets before execution; static examples verify their DC result path. Result selection is accepted end-to-end: selecting a simulation result highlights its corresponding location in the schematic preview. Transient plot-point inspection is accepted end-to-end for the RC example, including selected time/value and clearing the selection. Visualization result mapping treats non-finite numeric samples as failed data rather than allowing invalid values into downstream plotting.

Live AC oscilloscope pacing uses the actual simulation-time rate reported by successive live snapshots instead of assuming one simulated second per wall-clock second. The clock is interpolated between backend snapshots so the rolling window remains continuously moving while respecting the simulation's slower live execution pace.

The live schematic preview no longer overlays persistent live voltage/current boxes or current-direction arrows. The preview is kept as a schematic/context surface, while the Live oscilloscope and result explorer remain the measurement surfaces. The diode, NPN/PNP BJT, and NMOS/PMOS symbols are rendered as actual schematic symbols rather than generic component boxes.

## Handoff checkpoint — 2026-09-16

The current branch is `v0.4/dev-deploy`. The latest UI interaction commits are:

- `2edecdfc518ffcd6d1ac137621fe254322a8154d` — route schematic node clicks into selection state
- `413012912532f1980c8d0360a6b28968abdce738` — select schematic nodes on pointer down

The direct-placement implementation is present in `WorldCanvas.jsx`: it uses a dedicated placement overlay rather than relying on ReactFlow pane clicks, tracks a placement ghost, places on canvas click, and supports Escape cancellation.

The latest full deployed browser acceptance run for `2edecdf` completed with **19 passed / 7 failed**. The seven failures are interaction-regression failures caused by the new contextual Library/Inspector behavior, not seven independent simulation-engine failures:

- T01, T05: legacy tests open Library and then attempt Inspector input without selecting/closing the Library as expected by the new interaction model.
- T08: same contextual Inspector mismatch.
- T09, T13, T16: legacy tests attempt to open Instruments while the Library surface is still intercepting pointer events.
- UI Escape/Backspace test: it expected the Inspector to remain populated after the selected resistor was dismissed, conflicting with the new contextual-close behavior.

The important result is that the dedicated UI acceptance test for component placement now passes on the same run. The failures need to be repaired before declaring the redesign acceptance-green. Do not revert contextual behavior merely to satisfy the old selectors; adapt the acceptance workflow to the new interaction model where appropriate.

The most recent CI/deploy run for `4130129` was still pending at the time of this handoff. A new AI must check GitHub Actions before making assumptions about its result.

### Next implementation order

1. Verify the latest `4130129` CI/deploy/acceptance status.
2. Fix the acceptance workflow regressions caused by contextual surface interception/selection; preserve the intended UX.
3. Inspect fresh screenshots, especially empty workspace, first placement, selected component, wiring, simulation, and instrument states.
4. Continue the real interaction redesign: object-local inspection, first-class wiring feedback, explicit Build/Simulate mode treatment, progressive analysis controls, and instrument presentation.
5. Add or update deterministic UI acceptance around the new interaction model instead of preserving obsolete panel-centric assumptions.
6. Re-run the complete relevant pipeline and only then update this document with a green revision.

Never treat a passing DOM suite as sufficient for this milestone. Visual inspection is part of the acceptance gate.
