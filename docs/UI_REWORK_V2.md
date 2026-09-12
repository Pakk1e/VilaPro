# Electrical Workspace UI Rework V2

## Purpose

V2 is a presentation and interaction rework of the Electrical World workspace. The goal is not to assemble the existing Library, Inspector, Simulation, and Instruments panels into one dashboard. The goal is to make the schematic the primary workspace and make every supporting surface contextual.

## Design thesis

> **The circuit owns the screen. Tools orbit the circuit.**

Lab OS should feel like an electronics instrument that happens to run in a browser, not a SaaS dashboard containing an electronics canvas.

## Research-derived references

The design direction was informed by current circuit-editor patterns from EveryCircuit, CircuitLab, Multisim Live, LTspice, EasyEDA, KiCad/Qucs-S, Tinkercad Circuits, and professional EDA tools.

Common patterns worth carrying into Lab OS:

- the schematic is the visual center of gravity;
- tools are contextual and can be hidden without losing work;
- Build and Simulate are distinct workspace states;
- probing starts from the schematic and leads directly to measurements;
- properties are shown for the current selection rather than occupying permanent empty space;
- instruments/results are opened by user action and remain subordinate to the circuit;
- canvas space is protected from unnecessary chrome;
- engineering precision and beginner clarity must coexist.

Lab OS must not copy any one product's visual style.

## V2 workspace model

Normal state:

```text
┌────────────────────────────────────────────────────────────┐
│ Lab OS   Electrical       BUILD | SIMULATE       tools     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                     SCHEMATIC CANVAS                       │
│                                                            │
│              the circuit owns the screen                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

Supporting surfaces appear contextually:

- **Library:** temporary tool surface used to find/place components; closes after placement unless explicitly pinned.
- **Inspector:** appears when a component, terminal, wire, or result is selected; no large empty inspector region when nothing is selected.
- **Instruments:** appears after a measurement/probe workflow or explicit instrument action; it should not permanently consume the main workspace.
- **Simulation controls:** compact and mode-aware; detailed setup is disclosed only when relevant.

## Interaction model

### Build

1. Open Library when a component is needed.
2. Search or browse visual component choices.
3. Place onto the schematic.
4. Library closes or remains only if explicitly pinned.
5. Selection moves to the new component.
6. Inspector provides contextual editing.

### Simulate

1. Switch to Simulate.
2. Run the selected analysis.
3. Results become available without replacing the schematic.
4. Click a node, terminal, or component to inspect it.
5. Add measurements to an instrument when useful.
6. Instrument surfaces open only as needed.

### Probe-first workflow

```text
Build → Run → click node/component/terminal → inspect → add to instrument → compare/measure
```

## Visual principles

- Schematic-first, not panel-first.
- Canvas is visually dominant.
- Minimize persistent borders and boxed regions.
- Use whitespace and hierarchy instead of separators everywhere.
- Use engineering symbols as visual anchors.
- Keep the grid subtle.
- Use strong selection states without excessive decoration.
- Prefer compact controls with clear affordances.
- Avoid persistent empty states that look like unfinished panels.
- Do not use telemetry overlays as permanent schematic decoration.
- Focus mode should be a natural continuation of normal mode, not a rescue from a cluttered layout.

## Component Library

The library should behave as a tool drawer, not a permanent sidebar.

Requirements:

- visual component tiles with recognizable symbols;
- search first;
- recent components;
- useful categories;
- examples remain discoverable;
- placement should return attention to the schematic;
- pin/port geometry must remain visually meaningful.

## Inspector

The Inspector is contextual.

When selected:

- identify the object clearly;
- expose the most useful properties first;
- group electrical parameters logically;
- expose terminals/ports clearly;
- provide measurement/probe actions where meaningful;
- show simulation-derived values when available;
- keep advanced model information progressively disclosed.

When nothing is selected, do not reserve a large permanent region solely for an empty Inspector message.

## Instruments

Instruments are measurement tools, not dashboard cards.

Requirements:

- probe-driven creation;
- waveform, frequency response, table, point inspection, and measurements as appropriate to the analysis;
- resize without obscuring the circuit unnecessarily;
- select/remove probes from the instrument surface;
- map displayed data to actual simulation result series;
- maintain the distinction between simulation truth and visualization.

## Simulation modes

Build and Simulate remain distinct modes. Analysis choices include DC/static, transient, single-frequency AC, frequency sweep, and DC sweep. Live mode remains separate from static analysis.

The mode controls should be compact. Detailed setup belongs in contextual controls rather than a permanently expanded lower dashboard.

## Architecture boundary

V2 is a presentation/interaction replacement only.

```text
Visual/editor state
        ↓
World Graph
        ↓
Serializer
        ↓
Backend simulation
        ↓
Results
        ↓
Result mapping
        ↓
Instruments / visualization
```

Do not move simulation truth into React presentation state. Do not couple renderer details to backend result schema. Do not replace the World Graph because of visual layout changes.

## Acceptance criteria

A V2 milestone is not complete because CI is green. It must also be exercised in the deployed DEV environment against the exact revision.

Acceptance must verify at minimum:

- clean schematic-first initial state;
- Library opens/closes contextually;
- component placement returns focus to canvas;
- selection opens contextual Inspector;
- no large empty permanent panel dominates the workspace;
- Build/Simulate mode transition works;
- Run executes real simulation;
- probes map to real result data;
- Instruments open from actual measurement actions;
- focus mode does not alter circuit truth;
- no console/page errors;
- existing World Graph and simulation behavior remains intact.

## Implementation strategy

Treat the current V1 UI as a functional foundation, not a visual target. Rework presentation incrementally while preserving the existing simulation and World Graph contracts.

Priority order:

1. Canvas-first shell and spatial hierarchy.
2. Contextual Library.
3. Contextual Inspector.
4. Direct schematic selection/probing.
5. Contextual Instruments.
6. Compact simulation controls.
7. Schematic visual polish and interaction quality.
8. Remove obsolete dashboard-era UI.
9. Full CI and exact-revision deployed browser acceptance.
