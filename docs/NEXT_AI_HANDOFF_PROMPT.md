# Next AI Handoff Prompt — Lab OS Electrical UI

Continue autonomous development of the VilaPro / Lab OS project from the current state. Do **not** stop after individual steps or ask for confirmation. Work continuously until a genuine hard roadblock requires user input.

## Repository

- Repository: `Pakk1e/VilaPro`
- Branch: `v0.4/dev-deploy`
- Current UI direction: genuine Electrical World interaction redesign, not panel restyling.

## Read first

Before changing code, read:

1. `docs/START_HERE.md`
2. `docs/CURRENT_STATUS.md`
3. `VISION.md`
4. `docs/CONTRIBUTING.md` if present
5. `docs/UI_REWORK.md`
6. `docs/UI_REWORK_V2.md`
7. `docs/NEXT_AI_HANDOFF_PROMPT.md`

Then inspect the current implementation and recent commits on the branch.

## Product direction

Lab OS is a learning-focused interactive sandbox. The current Electrical World should feel like an electronics workbench/instrument, inspired by EveryCircuit, KiCad, LTspice, CircuitLab, Falstad/CircuitJS, Multisim Live, EasyEDA, Qucs-S, Altium, and Tinkercad Circuits.

The key principle is:

> **The circuit owns the screen. Tools orbit the circuit.**

The previous V2 shell was useful infrastructure but was mostly the old application redistributed into hideable/resizable panels. Do not mistake that for the finished rework.

## Architectural constraints

This is a presentation/interaction rework. Do not replace or duplicate:

- World Graph
- component definitions
- component instances
- serializer
- backend simulation model
- simulation execution
- runtime transport
- result truth

Keep visual/editor state separate from semantic World Graph state. Keep the World Graph separate from the backend simulation model. Keep result mapping separate from renderer/layout. Diagnose failures in this order:

`model → serializer → backend → transport → visualization → renderer → browser/CSS`

Do not create a second semantic circuit model in ReactFlow/UI state.

## Current implemented direction

The Electrical workspace currently has:

- schematic-first canvas
- compact top bar
- contextual Component Library
- contextual Inspector
- Instrument/Simulation surface
- engineering schematic symbols
- probe/result mapping
- focus mode
- explicit fit/center action
- temporary component placement

Component placement is now a real canvas interaction: choosing a component enters placement mode, a symbol ghost follows the pointer, clicking the dedicated placement layer inserts the component, and Escape cancels. The legacy `worlds:add-component` event remains for deterministic setup/example compatibility.

The Inspector is intentionally contextual and closes when selection is empty. The Library can intercept canvas/top-level interactions while open; acceptance tests must follow the new interaction model rather than assuming every surface is simultaneously interactive.

## Latest known validation state

Do not assume the latest run is green. Check GitHub Actions first.

Known latest sequence:

- `2edecdfc518ffcd6d1ac137621fe254322a8154d` — route schematic node clicks into selection state
- `413012912532f1980c8d0360a6b28968abdce738` — select schematic nodes on pointer down
- documentation commits were subsequently added for this handoff

The deployed acceptance run for `2edecdf` reached **19 passed / 7 failed**. The failures were primarily caused by old acceptance flows interacting with the new contextual Library/Inspector behavior:

- T01/T05: Inspector fields were requested while Library/context was still active or selection was not established as the new workflow expects.
- T08: contextual Inspector mismatch.
- T09/T13/T16: Instruments could not be clicked while the Library surface intercepted pointer events.
- UI Escape/Backspace test: expected the Inspector to remain after clearing selection, which conflicts with intentional contextual closing.

The dedicated component-placement UI test passed. A later commit attempted to make schematic selection deterministic; verify its CI/deploy/acceptance result before proceeding.

## Immediate workflow

1. Check current GitHub Actions runs/jobs for `v0.4/dev-deploy`.
2. If acceptance is failing, inspect the exact failure logs and artifacts.
3. Fix the tests/workflow to match the intended contextual interaction model. Do **not** weaken or revert the UX just to preserve obsolete panel-centric selectors.
4. Run/trigger the complete relevant CI/deploy/browser acceptance pipeline.
5. Inspect fresh screenshots/artifacts visually.
6. Only after the acceptance baseline is understood, continue the UI redesign.

## Next actual product work

After the acceptance baseline is stable, continue the **V2.5 Interaction Redesign** in this order where practical:

### 1. Object-local inspection

Selecting a component should make the object itself feel active. The Inspector should be a concise detail surface, not a generic application panel. Show only relevant identity, parameters, terminals, available quantities, and measurement actions. Keep the circuit dominant.

### 2. First-class wiring

Make wiring a direct canvas action. Starting from a terminal should provide obvious live feedback, a clear connection preview, sensible snapping, and a clean success/failure state. Wires should visually dominate UI chrome. Preserve semantic topology boundaries.

### 3. Explicit Build / Simulate modes

Treat Build and Simulate as modes of the same schematic workspace, not separate dashboards.

Build actions:
- select
- place
- move
- rotate
- wire
- edit
- delete

Simulate actions:
- choose analysis
- run/stop
- probe
- inspect
- instrument
- measure

Keep the schematic central in both modes.

### 4. Progressive analysis controls

Show only controls relevant to the selected analysis. Avoid presenting a large generic form. DC, transient, AC, sweep, and live controls should disclose specialized parameters only when necessary.

### 5. Instrument presentation

Instruments should appear because the user has something meaningful to inspect. Prefer `V(out)`, `I(R1)`, etc. over generic result names. Keep waveform/table surfaces compact and measurement-oriented. Dismissing an instrument should give space back to the schematic.

### 6. Visual refinement

Only after the interaction model is correct, refine symbol geometry, label placement, wire/junction clarity, typography, spacing, viewport behavior, responsive desktop behavior, keyboard interaction, accessibility, and focus mode.

## Visual acceptance gate

Every meaningful milestone must be visually inspected, not just DOM-tested. Review at minimum:

1. empty workspace
2. first component placement
3. small multi-component circuit
4. selected component
5. selected terminal/wire
6. simulation setup
7. simulation result/instrument
8. narrow desktop viewport
9. focus mode

Ask:

- Does the circuit dominate?
- Is the primary action obvious?
- Do surfaces feel contextual rather than like permanent app panels?
- Are symbols legible and balanced?
- Are labels and wires clean?
- Does any action unexpectedly zoom or move the viewport?
- Does the result/instrument explain itself without a generic dashboard wrapper?

## Testing rules

- Prefer deterministic model fixtures for circuit setup.
- Keep browser acceptance aligned with the intended user workflow.
- Do not preserve obsolete UI assumptions solely because old tests expect them.
- Run the complete relevant test suite before calling a change successful.
- For UI milestones, inspect screenshots/artifacts in addition to DOM assertions.
- Only report a revision as acceptance-green after verifying the deployed revision and browser acceptance result.

## Do not do

- Do not ask for confirmation after each step.
- Do not stop at a superficial CSS restyle.
- Do not merely resize/recolor panels and call it a redesign.
- Do not move simulation truth into the renderer.
- Do not create a duplicate semantic circuit model.
- Do not add persistent voltage/current telemetry boxes or arrows over the clean schematic.
- Do not rewrite backend simulation logic unless a concrete electrical capability requires it.

## Definition of success

The rework is successful when the application feels like an electronics instrument rather than the old app hidden behind floating panels: the schematic is the primary object, placement/selection/wiring begin on the canvas, inspection is contextual, Build/Simulate are modes of the same workspace, measurements originate from circuit objects, and instruments appear as meaningful result surfaces.

Continue autonomously, validate continuously, inspect visually, and update `docs/CURRENT_STATUS.md` when the engineering state materially changes.
