# Lab OS Current Status

## Purpose

This document is the handoff point for future development sessions. It describes the current engineering direction and what should be considered established before starting new work.

## Current project direction

Lab OS is a learning-focused interactive sandbox. The current implementation is the Electrical World and its circuit simulation workspace.

The long-term architecture supports multiple Worlds and multiple meaningful abstraction Layers. A future Layer may replace the current UI entirely and may use an independent simulation model.

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

The Electrical workspace has deterministic pre-created examples represented as editable World Graph templates. Current examples are Voltage divider, RC low-pass, Parallel resistors, RL transient, RLC transient, and Diode rectifier. Examples are graph templates, not separate simulation engines; they exercise the same editor, serializer, backend, and analysis paths as user-built circuits.

Electrical examples also carry explicit simulation presets in the example model. Static examples declare DC operating point; dynamic examples declare transient analysis with bounded, example-specific time ranges. The palette exposes the intended analysis, and loading an example applies that preset to the Simulation workspace through a tested configuration boundary.

## Simulation capabilities

The static analysis set now includes:

- DC operating point
- DC parameter sweep
- transient analysis
- single-frequency AC analysis
- frequency sweep / frequency-response analysis

Frequency Sweep is a dedicated analysis rather than a special case of DC sweep. It runs the existing AC solver at each requested frequency and stores a generic result with a frequency axis, point status, node-voltage magnitudes, branch-current magnitudes, and component V/I magnitudes. The frontend exposes start/stop/step frequency plus excitation amplitude and phase. The result plot uses Frequency (Hz) as its independent axis and is intended for RLC resonance/filter response work.

The first semiconductor component is now a Diode. Its canonical component definition exposes forward voltage (`Vf`) and on-resistance (`Ron`) parameters. The numerical implementation uses an explicit piecewise-linear active-set model:

```text
OFF: i = 0
ON:  v = Vf + i · Ron
```

The diode state is resolved iteratively using the existing linear network solver. This keeps the diode entity/definition separate from the numerical analysis method while providing deterministic forward conduction, reverse blocking, DC sweep threshold behavior, and transient algebraic switching. The initial diode model is intentionally simpler than a full Shockley/SPICE model; a more detailed semiconductor representation can be added later without changing the World Graph contract.

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

Continue the Electrical World implementation from concrete user-facing capabilities. The main simulation foundation now covers DC, transient, AC, DC parameter sweep, and frequency sweep, with the first diode component added on top of the same graph/semantic/simulation pipeline.

Useful next areas are:

- validate the clean schematic presentation across representative circuits
- improve frequency-sweep result interaction, including frequency-domain measurements and cursor inspection
- extend diode validation to transient rectification and more boundary cases
- add richer semiconductor models only when required by concrete circuits
- strengthen safe, bounded browser failure diagnostics
- add selective geometry assertions for known layout regressions
- improve architectural-boundary test reporting
- continue Electrical World implementation
- later, when requirements become concrete, real navigation between established Layers

## Validation state

The pre-created Electrical examples have real-backend browser acceptance coverage where appropriate. Dynamic examples verify their bounded simulation presets before execution; static examples verify their DC result path. Result selection is accepted end-to-end: selecting a simulation result highlights its corresponding location in the schematic preview. Transient plot-point inspection is accepted end-to-end for the RC example, including selected time/value and clearing the selection. Visualization result mapping treats non-finite numeric samples as failed data rather than allowing invalid values into downstream plotting.

Live AC oscilloscope pacing uses the actual simulation-time rate reported by successive live snapshots instead of assuming one simulated second per wall-clock second. The clock is interpolated between backend snapshots so the rolling window remains continuously moving while respecting the simulation's slower live execution pace.

The live schematic preview no longer overlays persistent live voltage/current boxes or current-direction arrows. The preview is kept as a schematic/context surface, while the Live oscilloscope and result explorer remain the measurement surfaces. The diode symbol is rendered as a proper diode rather than a generic component box.

The deployed Worlds acceptance workflow executes every `*acceptance.spec.js` file, so dedicated example and result-selection/inspection acceptance specs are included in exact-deployed-revision validation rather than only being present in the repository.

## Latest handoff point

The current branch has clean schematic presentation, a dedicated static Frequency Sweep analysis for RLC response, and the first Diode component with deterministic piecewise-linear DC/transient support. The repository also contains backend and frontend regression coverage plus dedicated browser acceptance for frequency sweep and diode behavior. The latest branch ref must be validated end-to-end before this handoff is considered complete.

## Future-session handoff

A new engineering session should begin by:

1. reading this document and the canonical vision/architecture documents
2. inspecting the current branch and recent commits
3. verifying the final CI/deployment state for the latest revision before making assumptions
4. checking existing tests before changing behavior
5. identifying the architectural boundary affected by the task
6. implementing the smallest coherent change
7. running the complete relevant validation/deployment/acceptance loop
8. only then reporting completion
