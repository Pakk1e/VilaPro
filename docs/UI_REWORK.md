# Lab OS Electrical Workspace UI Rework

## 1. Purpose

This document defines the product and interaction direction for the Electrical World frontend rework.

The existing simulation and World Graph foundations remain valuable. The goal is to replace the current presentation and interaction model with a focused circuit-workbench experience that makes the schematic the primary workspace and makes simulation, inspection, and measurement contextual.

This is a **frontend/presentation rework**, not a rewrite of the World Graph, serializer, simulation backend, or simulation transport.

## 2. Product goal

Lab OS Electrical should feel like:

> **An electronics instrument that happens to run in a browser.**

It should not feel like a collection of web-app cards and configuration panels.

The default experience is an open learning sandbox. Pre-created examples remain important, but the application should not constantly behave like a tutor or force a lesson sequence.

The UI is Layer-specific. This document describes the Electrical World workspace and must not become a requirement for future Worlds or Layers.

## 3. Research basis

The redesign is informed by established circuit-simulator interaction patterns:

- **EveryCircuit** — schematic-first browser interaction, simplicity, contextual editing, live visual feedback.
- **KiCad** — disciplined schematic editing, symbols, nets, probing, and engineering conventions.
- **LTspice** — strong simulation/probing workflow and waveform analysis from the schematic.
- **CircuitLab** — browser-friendly editing, contextual parameters, smart wiring, and analysis plots.
- **Falstad/CircuitJS** — immediate visual feedback and the idea that a running circuit can feel alive.

These products are UX references only. Lab OS does not reproduce their branding, implementation, or exact UI.

## 4. Core UX principles

### 4.1 Schematic first

The schematic is the dominant surface and should receive the majority of available screen space.

The user should be able to build, inspect, run, and probe a circuit without leaving the schematic workspace.

### 4.2 Context over configuration

The interface should answer "what am I looking at?" rather than asking "which panel should I open?".

Selection drives context:

- component → component properties and model information
- pin/terminal → terminal information and relevant quantities
- wire/net → net identity and electrical quantities
- result → corresponding schematic location and measurement context

### 4.3 Progressive disclosure

Do not show every simulation option, measurement, property, and advanced control permanently.

Show the controls relevant to the current analysis or selection. Advanced information should be available without dominating the default workspace.

### 4.4 Clean schematic

The normal schematic must remain visually clean.

Do **not** paint persistent voltage/current boxes or current-direction arrows over component symbols. Measurements belong in contextual inspection and instrument surfaces.

Live mode may provide restrained visual feedback, but it must not turn the schematic into a wall of telemetry.

### 4.5 Professional electrical conventions

The editor should progressively adopt recognizable schematic conventions:

- proper component symbols
- meaningful terminal/pin labels
- reference designators
- values where appropriate
- grid snapping
- predictable rotation and mirroring
- orthogonal wiring
- junctions
- net labels
- stable spacing and alignment

### 4.6 Fast interaction

Common actions should require as few steps as possible.

Important interactions should support keyboard shortcuts and direct manipulation. A command/search surface can be added later for discoverability and power-user workflows.

### 4.7 Canvas stability

Adding, deleting, selecting, or editing a component must not unexpectedly zoom or move the user's viewport.

Fit-to-content is an explicit command, not an automatic side effect of normal editing.

### 4.8 Physical model and presentation remain separate

The frontend must continue to respect the established architecture:

- World Graph is canonical editable domain state.
- Renderer/layout is presentation state.
- ReactFlow/editor structures are not simulation truth.
- Coordinates are presentation, not topology.
- Component definitions are distinct from instances.
- Simulation model/transport remains separate from editor state.

## 5. Target workspace

The primary Electrical workspace consists of four contextual surfaces.

```text
┌─────────────────────────────────────────────────────────────────────┐
│ LAB OS   Electrical / Example          Analysis ▾    ▶ Run     ⋮    │
├───────────────┬─────────────────────────────────────┬───────────────┤
│ COMPONENT     │                                     │               │
│ LIBRARY       │                                     │   INSPECTOR   │
│               │                                     │               │
│ Search...     │                                     │   Selection   │
│               │            SCHEMATIC               │               │
│ Basic         │                                     │   Properties  │
│ Sources       │                                     │   Model       │
│ Diodes        │                                     │   Quantities  │
│ Transistors   │                                     │               │
│ MOSFETs       │                                     │               │
│               │                                     │               │
├───────────────┴─────────────────────────────────────┴───────────────┤
│ INSTRUMENTS     Waveform     Table     Measurements       ▲/▼      │
├─────────────────────────────────────────────────────────────────────┤
│                         selected instrument                         │
└─────────────────────────────────────────────────────────────────────┘
```

The four surfaces are:

1. **Component Library** — finding and placing components.
2. **Schematic Canvas** — building and navigating the circuit.
3. **Inspector** — contextual properties and quantities for the current selection.
4. **Instrument Panel** — simulation results, plots, tables, and measurements.

All secondary surfaces must be collapsible/resizable. The canvas must have a useful focus mode where the surrounding surfaces can be hidden.

## 6. Top bar

The top bar should be deliberately small.

It should communicate:

- Lab OS / current workspace identity
- current World/example or circuit name
- current analysis
- primary Run/Stop control
- access to analysis configuration
- access to less-common workspace actions

It should not become a second toolbar filled with icons.

### Analysis control

Analysis and execution mode remain separate concepts.

The user chooses an analysis such as:

- DC operating point
- transient
- AC
- DC sweep
- frequency sweep

Then the top bar exposes only the settings relevant to that analysis.

Static and Live remain execution modes and must not be collapsed into one result type.

## 7. Component library

The library replaces a generic component picker with a real component browser.

### Required behavior

- search by component name
- grouped categories
- compact symbol previews
- drag or click-to-place
- recently used components
- clear distinction between component definition and placed instance

Initial categories should include at least:

- Basic
- Sources
- Diodes
- Transistors
- MOSFETs
- Ground / references

Future categories must not require redesign of the overall workspace.

### Placement

Placing a component should:

1. create the semantic instance in the World Graph/editor model
2. position it predictably
3. keep the viewport stable
4. select the new instance
5. expose its properties in the Inspector

Automatic zooming after placement is explicitly undesirable.

## 8. Schematic canvas

The canvas is the primary work surface.

### Visual requirements

- clean engineering-style symbols
- subtle grid
- strong but restrained selection state
- clear connection points
- orthogonal wire routing
- visible junctions when needed
- readable reference/value labels
- no unnecessary cards around components
- no persistent measurement overlays

### Interaction requirements

The user should be able to:

- pan
- zoom
- select
- multi-select
- move
- rotate
- delete
- wire terminals
- edit properties
- duplicate where supported
- fit the circuit deliberately

### Wiring

Wiring is a first-class interaction, not a secondary representation of graph edges.

The editor should make it obvious:

- where a connection can start
- which terminal is being targeted
- where a junction exists
- which net a wire belongs to
- when a wire is incomplete or invalid

The visual route must remain presentation state; semantic connectivity remains in the World Graph.

## 9. Inspector

The Inspector is contextual and selection-driven.

### Component example

```text
R1
Resistor

VALUE
1 kΩ

MODEL
Ideal resistor

INSTANCE
Reference   R1
```

When simulation data is available, relevant quantities may be added:

```text
VOLTAGE
4.82 V

CURRENT
4.82 mA

POWER
23.2 mW
```

The exact quantities depend on the component and analysis.

### Net example

```text
Vout

NODE VOLTAGE
4.82 V

CONNECTED
R2.1
C1.1
Q1.C

[ Add to instrument ]
```

### Transistor example

```text
Q1
NPN Transistor

VBE       0.71 V
VCE       4.93 V
IB        ...
IC        ...
REGION    Forward Active
```

The Inspector should not become a permanent dashboard. Empty selection means a useful, quiet empty state.

## 10. Simulation interaction

Simulation should be a natural continuation of schematic editing.

### Run

`Run` executes the selected analysis using the current graph and configuration.

### Stop

`Stop` is available when execution is active.

### Results

Results appear in the Instrument Panel rather than replacing the schematic.

### Probe-first interaction

The preferred workflow is:

```text
Build circuit
    ↓
Run analysis
    ↓
Click a node/component/terminal
    ↓
Inspect quantity
    ↓
Add to instrument
    ↓
Compare/measure
```

The user should not need to manually construct a result request for common measurements.

## 11. Instrument panel

The Instrument Panel is the measurement surface.

It is normally collapsed when no useful result exists and expands after simulation or explicit inspection.

### Instrument types

Initial types:

- waveform plot
- frequency-response plot
- result table
- point inspection
- measurements

### Waveform interaction

The plot should support:

- multiple traces
- clear axis labels and units
- zoom/pan
- point/cursor inspection
- selected time/value
- removing traces
- adding a selected node/component quantity

### Frequency response

Frequency sweep should use a frequency-domain presentation with:

- Frequency (Hz) X-axis
- selectable voltage/current magnitude traces
- cursor inspection
- frequency/value readout
- future support for phase and derived measurements

### Instrument context

The instrument should identify exactly what it is showing, for example:

`V(out)`

rather than a generic "Result 1" label.

## 12. Live mode

Live mode is an execution mode, not a separate application.

It should reuse the same workspace shell:

```text
Design → Run → Live
```

The schematic remains the context surface. The oscilloscope/instrument panel becomes the primary measurement surface.

The live clock should continue to respect actual simulation-time progression. The existing live timing architecture should be preserved.

Live visual feedback should be restrained and purposeful. Persistent voltage/current boxes and current-direction arrows are explicitly excluded from the target design.

## 13. Examples

Examples remain a first-class entry point, not merely fixtures hidden in code.

The example launcher should make it easy to start with a known circuit while preserving the same workspace used for user-created circuits.

Examples should communicate:

- circuit name
- what concept it demonstrates
- expected analysis
- optionally a short description

Loading an example must continue to use the same graph, serializer, backend, and analysis paths as a user-built circuit.

## 14. Empty and onboarding states

The first-use workspace should be useful without requiring a tutorial.

A good empty state can offer:

- Create circuit
- Open example
- Search component

It should avoid a large instructional wall.

## 15. Focus mode

A dedicated focus mode should maximize the schematic.

Expected behavior:

```text
Normal
[Library] [Canvas] [Inspector]
[           Instruments           ]

Focus
[                 Canvas                 ]
```

Focus mode must not change the underlying model or simulation state.

## 16. Responsive behavior

The first target is desktop browser use.

The layout should still degrade predictably at narrower widths:

- library can collapse to icon rail
- inspector can collapse
- instruments can collapse
- canvas retains priority

Mobile-specific circuit editing is not a current requirement.

## 17. Visual language

The visual language should be technical, calm, and restrained.

Prefer:

- strong typography hierarchy
- compact controls
- subtle borders
- restrained surfaces
- clear spacing
- consistent iconography
- high-quality circuit symbols
- visual emphasis on the schematic

Avoid:

- excessive rounded cards
- decorative dashboard widgets
- large empty headers
- persistent telemetry badges
- unnecessary gradients
- excessive shadows
- every control being presented as a separate card

The UI should feel closer to a laboratory instrument than a SaaS dashboard.

## 18. Accessibility and interaction quality

The rework must retain accessible interaction principles:

- keyboard-focusable controls
- visible focus states
- meaningful labels
- sufficient contrast
- no color-only indication of electrical state
- predictable keyboard shortcuts
- tooltips for unfamiliar icon-only actions

## 19. Architecture boundary

The frontend rework must preserve the established flow:

```text
                 WORLD GRAPH
                     │
          ┌──────────┴──────────┐
          │                     │
   Editor projection      Simulation input
          │                     │
          ▼                     ▼
     Schematic UI          Simulation engine
          │                     │
          └──────────┬──────────┘
                     ▼
              Result / runtime
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
      Inspector             Instruments
```

The UI must never become the owner of physical truth.

A schematic wire route is not the electrical topology. A screen coordinate is not a component's semantic identity. A plot trace is not the simulation model.

## 20. Migration strategy

This should be implemented as a controlled frontend replacement, not as a risky one-shot deletion.

### Phase 1 — New shell

Create the new workspace shell and layout primitives.

Deliver:

- top bar
- collapsible library surface
- canvas region
- inspector region
- instrument region
- focus mode

At this stage the existing editor/simulation capabilities may be adapted behind the new shell.

### Phase 2 — Schematic editor

Replace the current schematic presentation with the new electrical visual language.

Deliver:

- symbols
- grid
- stable viewport
- selection
- placement
- movement
- rotation
- deletion
- orthogonal wires
- junctions

ReactFlow may continue to provide editor mechanics during this phase if that reduces risk. It must remain an implementation detail rather than becoming the domain model.

### Phase 3 — Contextual Inspector

Replace generic property panels with selection-driven inspection.

Deliver:

- component properties
- terminal context
- net context
- simulation quantities
- model information

### Phase 4 — Simulation controls

Move analysis configuration into contextual top-bar controls.

Deliver:

- analysis selector
- analysis-specific settings
- Run/Stop
- clear execution state

### Phase 5 — Instruments

Replace the current result/simulation presentation with the instrument surface.

Deliver:

- waveform instrument
- frequency-response instrument
- table
- point inspection
- trace management
- probing from schematic

### Phase 6 — Live

Integrate Live execution into the same shell.

Deliver:

- live control state
- oscilloscope
- restrained live visual feedback
- stable simulation-time pacing

### Phase 7 — Examples

Make examples discoverable from the workspace while keeping them on the same graph/editor/simulation path.

### Phase 8 — Remove obsolete UI

Only after the new workspace has equivalent or improved coverage should obsolete panels/components be removed.

## 21. Validation strategy

The rework is complete only when the new UI is validated across the real pipeline.

### Model/architecture

- World Graph tests remain green.
- serializer tests remain green.
- simulation configuration tests remain green.
- result mapping tests remain green.

### Browser interaction

Acceptance coverage should verify at minimum:

- open workspace
- load example
- place component
- edit component
- connect terminals
- stable viewport after placement
- run DC
- run transient
- run AC
- run DC sweep
- run frequency sweep
- inspect result
- select plot point
- clear plot selection
- Live mode
- semiconductor examples

### Visual checks

Targeted visual assertions should verify known regressions rather than relying on broad pixel-perfect screenshots.

Important visual regressions include:

- component hidden behind library
- unexpected zoom after placement
- broken wire routing
- unreadable labels
- instrument panel covering schematic unexpectedly
- incorrect symbol orientation
- inspector detached from selection

### Deployment

The complete relevant CI/deployment/browser acceptance pipeline must pass against the exact deployed revision before a UI milestone is declared successful.

## 22. Explicit non-goals

The first UI rework does **not** require:

- rewriting the simulation engine
- rewriting the World Graph
- implementing speculative multi-World UI
- fabricating Layer navigation
- implementing every future component
- mobile-first editing
- a full custom rendering engine if the current editor mechanics can support the target UX
- persistent live telemetry painted over the schematic

## 23. Success criteria

The redesign succeeds if a user can naturally perform this sequence without feeling like they are navigating an administration interface:

```text
Open example
    ↓
See clean schematic
    ↓
Select a component
    ↓
Edit its value in Inspector
    ↓
Add/connect another component
    ↓
Run analysis
    ↓
Click the interesting node/component
    ↓
See its electrical quantity
    ↓
Open instrument
    ↓
Inspect waveform / response
    ↓
Return to editing without losing context
```

The central test is not whether the UI contains all existing controls. It is whether the user can understand and manipulate the circuit with minimal friction.

## 24. Relationship to existing architecture documents

This document defines **frontend product and interaction direction**. It does not replace the canonical architecture, World, Layer, simulation, or decision documents.

Existing architectural rules remain authoritative. In particular, the UI must continue to respect the decisions that the UI is Layer-specific, the World Graph is not universal truth, the renderer is not simulation truth, static and Live are separate execution modes, and unknown future capabilities should not be prematurely designed into the current workspace.

When this document conflicts with a lower-level implementation detail, preserve the architectural boundary and redesign the presentation around it rather than weakening the boundary.
