# VilaPro Worlds Architecture

This document is the engineering source of truth for the Worlds application architecture. It is intentionally separate from the product vision: product direction can evolve, but these boundaries should only change deliberately.

## 1. Core principle

Worlds is a visual system-modeling and simulation workspace, not a form-driven component picker.

The architecture must keep these concerns separate:

```text
Visual World Model
       │
       ├── editing / selection / layout
       │
       ▼
Canonical World Graph
       │
       ├── serialization boundary
       │
       ▼
Simulation / VDL Model
       │
       ├── analysis
       │
       └── execution mode
              ├── Static
              └── Live
       │
       ▼
Results / Runtime State
       │
       ▼
Visualization
```

The visual canvas model is not the backend simulation model. A renderer must not become the source of simulation truth, and the solver must not dictate the editor's data structures.

## 2. Canonical layers

### 2.1 Component definition

A component definition describes what a component is independent of any particular placement.

It contains, where applicable:

- stable component type
- description/category
- ports
- parameter definitions
- defaults
- units
- visibility rules
- simulation parameter mappings
- future layer-specific representations

Current frontend definitions live in `frontend-dev/src/applications/worlds/model/worldDefinitions.js`.

### 2.2 Component instance

A component instance is a placed occurrence of a definition.

Minimum identity/data contract:

- stable instance id
- component type
- position/layout state
- rotation/layout state when supported
- label/display name
- current property values
- ports derived from the definition

Instance state must not duplicate the component definition unnecessarily.

### 2.3 World graph

The World graph is the canonical visual/editing model.

A graph contains:

- component nodes
- junction nodes where applicable
- connections/wires
- node layout/interaction state

Graph invariants:

1. Every node id is unique.
2. Every component node has a valid component type.
3. Every component port id is defined by its component definition.
4. Every connection references existing source/target nodes.
5. Every connection references valid source/target handles.
6. Electrical connections are represented by topology/endpoints, not screen coordinates as their source of truth.
7. Deleting a component must not leave dangling connections.
8. Moving or zooming the canvas must not change electrical topology.
9. Renderer state must not silently mutate simulation semantics.

### 2.4 Serialization boundary

`worldGraphSerializer` is the explicit bridge from visual graph data to the backend simulation description.

```text
ReactFlow/editor state
        ↓
WorldGraph
        ↓ validate
worldGraphSerializer
        ↓
Simulation request
        ↓
Backend simulation model
```

The serializer is responsible for:

- validating graph topology
- resolving electrical nets
- mapping component types
- mapping instance properties to backend parameters
- converting source waveform configuration
- producing a stable backend-facing description

The serializer is not responsible for drawing, layout, zoom, or UI state.

### 2.5 Simulation model

The backend simulation model represents the physical/semantic system required by an analysis. It should not depend on ReactFlow or browser-specific structures.

Backend simulation concepts include:

- component instances
- parameters
- ports/nets
- equations/representations
- analysis configuration
- simulation session state
- result datasets

The same component may have multiple valid representations depending on layer and analysis. Numerical methods such as Backward Euler are analysis representations, not the definition of the physical component.

## 3. Connections and topology

Connections are semantic topology. Screen geometry is presentation.

For an electrical graph:

```text
Component port ── wire ── component port
                         │
                      junction
                         │
                     other port
```

The serializer resolves this topology into electrical nets. Ground is a semantic reference and must remain distinct from arbitrary screen position.

A future renderer may change routing, line shape, or visual styling without requiring a change to the electrical graph.

## 4. Rendering boundary

The renderer consumes canonical graph/component data and produces a visual representation.

Responsibilities:

- calculate visible geometry
- draw component symbols
- draw ports and labels
- draw wires from semantic connection data
- reflect selection/hover state
- keep labels readable
- support zoom/viewport behavior

Non-responsibilities:

- deciding whether a circuit is electrically valid
- changing component parameters implicitly
- creating hidden electrical connections solely to make a drawing look connected
- becoming a second serializer

The ReactFlow editor is the current interactive representation. `SchematicPreview` is a presentation consumer and must consume the actual graph connection shape rather than inventing a parallel wire model.

## 5. Simulation architecture

Analysis and execution mode are independent dimensions.

```text
Simulation
├── Analysis
│   ├── DC
│   ├── Transient
│   ├── AC
│   └── future analyses
│
└── Execution Mode
    ├── Static
    └── Live
```

Static:

```text
Frontend → request → Backend → complete result
                              ↓
                    Dataset → Series → Plot
```

Live:

```text
Frontend → session/start → Backend runtime
Frontend ⇐ live state/updates ⇐ Backend
```

Live must not become a second static result format. It is a runtime/state boundary with its own lifecycle and sampling policy.

## 6. Result and visualization boundaries

Static result flow:

```text
Simulation result
      ↓
Generic datasets
      ↓
SimulationSeries
      ↓
SimulationPlot
      ↓
Visualization payload
      ↓
Worlds Result Explorer
```

Live result flow:

```text
Simulation runtime
      ↓
Live state / sampled signals
      ↓
Live visualization model
      ↓
Schematic overlays / oscilloscope / meters
```

Do not create analysis-specific frontend result formats when an existing shared contract can express the data.

## 7. Interactive simulation UX

The schematic is the primary live surface.

The intended interaction model is:

- direct component/node selection
- values shown in circuit context
- animated voltage/current information where meaningful
- compact persistent oscilloscope
- bounded moving time window
- direct Run/Pause/Stop controls
- context-sensitive component properties
- responsive/collapsible auxiliary panels

The EveryCircuit interaction model is a reference for principles only. Worlds must retain its own architecture, visual language, and implementation.

## 8. Debugging boundaries

When behavior is wrong, diagnose in this order:

1. **World graph** — is the topology/state correct?
2. **Serializer** — does the backend payload correctly represent the graph?
3. **Backend simulation** — does the semantic model/analysis produce the expected result?
4. **Runtime transport** — are live/static results transferred correctly?
5. **Visualization model** — is the result mapped correctly to the UI?
6. **Renderer/layout** — is correct data displayed incorrectly?
7. **Browser/CSS** — is the final presentation broken?

This prevents UI symptoms from being fixed by corrupting the underlying model.

## 9. Test strategy

Testing is layered.

### Contract tests

Fast deterministic tests prove model boundaries and invariants without a browser.

Examples:

- valid graph serializes to expected instances/nets
- invalid endpoints are rejected
- missing/unconnected terminals are rejected
- waveform configuration serializes correctly
- serialization is deterministic
- supported component definitions map to supported backend types

### Component/model tests

Test pure transformations and state transitions independently from the browser.

### Browser acceptance

Playwright proves real user workflows and integration across the deployed Worlds application.

Acceptance tests should test user-visible behavior, not implementation details whenever practical.

### Visual verification

Screenshot/geometry checks are appropriate for layout-sensitive behavior such as:

- component insertion/positioning
- palette overlap
- schematic/wire alignment
- simulation workspace layout
- oscilloscope readability

## 10. Deterministic fixtures

Canonical graph fixtures live under the Worlds model test area. Fixtures represent known circuits and should be reusable by model tests and, where practical, browser tests.

Recommended baseline fixtures:

- empty world
- resistor
- voltage divider
- series circuit
- sine source
- RC circuit
- AC test circuit

A fixture should describe semantic graph state rather than browser coordinates unless the test specifically targets layout.

## 11. Browser diagnostics

A failing acceptance test should provide enough evidence to distinguish application state from presentation failure.

Failure diagnostics should include where practical:

- screenshot
- Playwright trace
- console/page errors
- current URL
- viewport/zoom
- selected node
- relevant graph JSON
- test fixture name

Success artifacts should remain lightweight; failure artifacts should be richer.

## 12. Stable interaction boundaries

Use stable semantic roles and targeted `data-testid` selectors only at important integration boundaries.

Examples:

- `worlds-canvas`
- `component-palette`
- `component-inspector`
- `simulation-panel`
- `simulation-setup`
- `live-oscilloscope`
- `simulate-button`

Do not add test IDs everywhere. Prefer accessible roles/labels first.

## 13. Schema and validation direction

As the graph evolves, introduce explicit runtime validation at the graph/simulation boundary.

The target is:

```text
Editor
  ↓
validated WorldGraph
  ↓
validated SimulationRequest
  ↓
validated SimulationModel
  ↓
validated Result/RuntimeState
```

Validation should produce useful, component-specific errors rather than generic failures.

## 14. Change workflow

For architectural or functional changes:

1. Inspect the relevant architecture and current implementation.
2. Identify the invariant that must remain true.
3. Make the smallest coherent change.
4. Add/update deterministic tests.
5. Run static/unit/model validation.
6. Build/deploy the exact revision.
7. Run the complete Worlds acceptance suite.
8. Inspect logs and artifacts.
9. Only report success after the complete relevant pipeline is green.

A partial test run is not evidence that the change works.

## 15. Long-term direction

Worlds should become a visual, interactive system-modeling environment capable of multiple simulation layers.

The architecture should therefore support future layers without forcing every layer into an electrical-specific implementation:

```text
Worlds
 ├── Electrical
 ├── Thermal
 ├── Mechanical
 ├── Control
 ├── Fluid
 └── future layers
```

The visual world model remains separate from layer-specific semantics. Components can acquire deeper representations over time without breaking the editor or simulation runtime boundaries.

This document defines engineering boundaries. Product vision, priorities, and user-facing goals should be captured separately once the current optimization and architecture work is complete.
