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

The Electrical workspace has deterministic pre-created examples represented as editable World Graph templates. Current examples are Voltage divider, RC low-pass, Parallel resistors, RL transient, RLC transient, Diode rectifier, NPN transistor bias, NPN low-side switch, PNP high-side switch, NMOS low-side switch, PMOS high-side switch, and CMOS inverter. Examples are graph templates, not separate simulation engines; they exercise the same editor, serializer, backend, and analysis paths as user-built circuits.

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

The target interaction model remains probe/context driven: selecting a component, terminal, wire/net, or result exposes relevant information. Build and Simulate remain distinct workspace modes while sharing the same shell. Results remain in contextual instruments rather than replacing the schematic.

The schematic must remain clean. Persistent voltage/current boxes and current-direction arrows are explicitly excluded from the target UI. Live mode may provide restrained visual feedback, while measurement remains primarily an instrument/inspection concern.

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

The dedicated branch `v0.4/electrical-ui-rework` contains these presentation stages. Secondary surfaces are closed by default and overlay the canvas only when requested.

Simulation-model work should continue independently when concrete electrical examples require it, including future semiconductor behavior and small-signal representations.

## Validation state

The pre-created Electrical examples have real-backend browser acceptance coverage where appropriate. Dynamic examples verify their bounded simulation presets before execution; static examples verify their DC result path. Result selection is accepted end-to-end: selecting a simulation result highlights its corresponding location in the schematic preview. Transient plot-point inspection is accepted end-to-end for the RC example, including selected time/value and clearing the selection. Visualization result mapping treats non-finite numeric samples as failed data rather than allowing invalid values into downstream plotting.

Live AC oscilloscope pacing uses the actual simulation-time rate reported by successive live snapshots instead of assuming one simulated second per wall-clock second. The clock is interpolated between backend snapshots so the rolling window remains continuously moving while respecting the simulation's slower live execution pace.

The live schematic preview no longer overlays persistent live voltage/current boxes or current-direction arrows. The preview is kept as a schematic/context surface, while the Live oscilloscope and result explorer remain the measurement surfaces. The diode, NPN/PNP BJT, and NMOS/PMOS symbols are rendered as actual schematic symbols rather than generic component boxes.

The deployed Worlds acceptance workflow executes every `*acceptance.spec.js` file, so dedicated example and result-selection/inspection acceptance specs are included in exact-deployed-revision validation. The current acceptance suite includes the diode, NPN/PNP BJT, NMOS/PMOS, and CMOS inverter examples in addition to the established DC, transient, AC, sweep, live, and result-selection coverage. The UI rework branch also adds a focused Electrical workspace acceptance spec covering contextual surfaces, component search/add, Inspector wiring, instrument-panel migration, resizing, and focus mode.

The branch CI validates the frontend lint/test/build pipeline and backend suite. DEV deployment is available through the dedicated `v0.4/dev-deploy` ref, allowing an exact tested UI-rework SHA to be deployed without deploying every development commit. The deployed revision must still pass the complete relevant browser acceptance suite before a milestone is declared successful.

## Latest handoff point

The latest validated application revision before the UI rework is `606b7becd297866521919cb47b0cea9970a7f0ad`; its complete deployed browser acceptance suite passed 23/23 tests. The current UI rework branch has additional frontend-only changes and an acceptance-alignment pass; the exact current revision still requires the final CI/deployment/acceptance loop before being declared a validated milestone.

The branch contains the approved Electrical UI rework specification in `docs/UI_REWORK.md`, the V2 visual direction in `docs/UI_REWORK_V2.md`, and the implementation stages described above. Continue the migration toward the canvas-first workbench, then remove obsolete simulation/editor UI only after equivalent acceptance coverage exists.

## Future-session handoff

A new engineering session should begin by:

1. reading this document and the canonical vision/architecture documents
2. reading `docs/UI_REWORK.md` and `docs/UI_REWORK_V2.md` before changing Electrical frontend structure
3. inspecting the current branch and recent commits
4. verifying the final CI/deployment state for the latest revision before making assumptions
5. checking existing tests before changing behavior
6. identifying the architectural boundary affected by the task
7. implementing the smallest coherent change
8. running the complete relevant validation/deployment/acceptance loop
9. only then reporting completion
