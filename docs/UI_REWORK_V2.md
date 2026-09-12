# Electrical Workspace UI Rework — V2 Direction

## Status

Approved direction for the next presentation-layer iteration of the Electrical World UI.

Implementation is now through the canvas-first shell, contextual Library/Inspector/Instruments surfaces, compact component library, engineering symbol pass, probe/result integration, and the first acceptance alignment pass. Remaining work is validation/polish rather than another layout redesign.

This document supersedes the visual/layout assumptions of the first UI rework iteration while preserving its architectural boundaries, simulation behavior, and validation requirements.

## 1. Why V2 exists

The first UI rework successfully established the workspace shell, contextual surfaces, schematic renderer, Inspector, simulation surface, probes, and instrument integration. However, the resulting composition still read as a dashboard: Library, Canvas, Inspector, Analysis, and Instruments were visible as equal-sized application regions.

That is not the intended product experience.

The target is an **electronics workbench/instrument**, not a collection of panels.

The schematic is the primary object. Secondary tools should appear because the user needs them and should give the canvas space back when dismissed.

## 2. Research basis

The V2 direction was informed by a broader review of established circuit-design and simulation interfaces:

- **EveryCircuit** — strongest reference for schematic-first immediacy, contextual editing, and simulation feedback remaining connected to the circuit.
- **CircuitLab** — useful Build/Simulate separation, direct component placement, contextual parameter editing, and browser-friendly interaction.
- **Multisim Live** — useful relationship between schematic, probing, and grapher/result surfaces without permanently replacing the schematic.
- **LTspice** — direct probing from schematic objects into waveform analysis; the circuit remains the source of measurement context.
- **Falstad/CircuitJS** — immediate, visually understandable simulation behavior and the idea that a running circuit should feel alive without becoming a telemetry dashboard.
- **EasyEDA** — collapsible/roll-up tool surfaces that return space to the editor.
- **KiCad / Qucs-S / Altium** — engineering conventions, disciplined schematic editing, contextual properties, symbols, nets, and professional information hierarchy.
- **Tinkercad Circuits** — beginner-friendly placement and a strong distinction between the design workspace and the component/tool collection.

These are UX references only. Lab OS must not copy their branding, implementation, or exact UI.

## 3. Core V2 principle

> **The circuit owns the screen. Tools orbit the circuit.**

The default state should already feel close to focus mode. A user should open an empty Electrical workspace and primarily see a calm schematic canvas, not three empty side panels and an empty results area.

## 4. Target composition

Default:

```text
┌───────────────────────────────────────────────────────────────┐
│ LAB OS   Electrical       DESIGN / SIMULATE          tools     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                                                               │
│                         SCHEMATIC                             │
│                                                               │
│                 circuit owns the space                       │
│                                                               │
│                                                               │
│   canvas controls                                   status    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

Contextual library:

```text
┌────────────────────────────┐
│ Search components          │
│                            │
│ Recent                     │
│  R     C     L     D       │
│                            │
│ Sources                    │
│  V     I     GND           │
│                            │
│ Basic / Diodes / MOSFETs  │
└────────────────────────────┘
```

Contextual Inspector:

```text
┌────────────────────────────┐
│ R1  Resistor               │
│                            │
│ VALUE                      │
│ 1 kΩ                       │
│                            │
│ MODEL                      │
│ Ideal resistor             │
│                            │
│ QUANTITIES                 │
│ V     4.82 V               │
│ I     4.82 mA              │
│ P     23.2 mW              │
│                            │
│ [ Add to instrument ]      │
└────────────────────────────┘
```

Instrument surface:

```text
┌───────────────────────────────────────────────────────────────┐
│ V(out)                                      ×   ⤢             │
│                                                               │
│       waveform                                                │
│                                                               │
│  time ─────────────────────────────────────────────────────── │
└───────────────────────────────────────────────────────────────┘
```

These surfaces are overlays/docks, not permanent columns.

## 5. Surface behavior

### Library

- Closed by default.
- Opens as a compact floating drawer anchored to the workspace edge.
- Search is the primary control.
- Component entries use recognizable symbols and compact names.
- Clicking a component places it at the canvas focus and closes the drawer, keeping the canvas immediately usable.
- Recent components are prioritized.
- Categories are compact rather than explanatory cards.

### Inspector

- Closed by default.
- Opens automatically or remains available when a selection exists.
- Empty selection should not create a large blank panel.
- Component, terminal, net, and result selection determine its content.
- The Inspector should feel like a property instrument, not a configuration dashboard.
- Numeric/select properties remain real form controls so editing is direct and testable.

### Instruments

- Closed when there is no useful result.
- Opens after an explicit instrument/probe action or when results are ready, without obscuring the circuit unexpectedly.
- Resizable from the top edge.
- Can be reduced to a compact dock/tab when not actively inspected.
- Plot identity must be specific (`V(out)`, `I(R1)`) rather than generic (`Result 1`).

## 6. Build / Simulate modes

The workspace must make the two modes perceptually distinct without creating two different applications.

### Build

Primary actions:

- place
- move
- rotate
- wire
- edit
- delete

The canvas remains visually quiet and uncluttered.

### Simulate

Primary actions:

- choose analysis
- run/stop
- probe
- inspect
- instrument
- measure

The schematic remains visible while results appear in contextual instruments.

## 7. Visual language

The V2 visual language should be technical, calm, and precise.

Prefer:

- large usable canvas
- restrained neutral surfaces
- one strong information hierarchy
- crisp engineering symbols
- subtle grid
- compact typography
- subtle separators only where they improve orientation
- shallow elevation for contextual overlays
- direct manipulation over form-heavy controls

Avoid:

- dashboard card grids
- three equal permanent columns
- large empty framed regions
- excessive rounded cards
- decorative gradients
- persistent telemetry badges
- giant section headers
- duplicated labels describing the same state
- making every control look like a separate application panel
- non-functional controls

## 8. Schematic visual hierarchy

The schematic should be visually stronger than the surrounding chrome.

Components should have:

- recognizable electrical symbols
- clear reference designators
- readable values where appropriate
- visible connection points
- restrained selection state
- predictable orientation
- consistent spacing

Wires should be:

- orthogonal
- visually prominent enough to read
- cleanly joined at junctions
- easy to start/end
- free of unnecessary UI boxes

Simulation data should not be permanently painted over the schematic. Probing and live feedback may highlight a selected object, but measurement remains primarily contextual/instrument information.

## 9. Probe workflow

The preferred interaction remains:

```text
Build
  ↓
Run
  ↓
Click node / component / terminal
  ↓
Inspect
  ↓
Add to instrument
  ↓
Measure / compare
```

The user should not need to navigate a generic results configuration page for common measurements.

## 10. Empty state

An empty workspace should feel like a blank laboratory bench, not an unfinished dashboard.

A restrained hint may offer:

- Add component
- Open example
- Search component

No large instructional wall is required.

## 11. Responsive behavior

Desktop remains the primary target.

As width decreases:

1. canvas keeps priority
2. Library collapses before the canvas is squeezed
3. Inspector collapses before the canvas is squeezed
4. Instruments become a compact dock/sheet
5. Focus behavior becomes increasingly automatic

## 12. Architecture boundary

V2 is still a presentation/interaction rework.

Do not change the established domain boundaries:

```text
World Graph
    ↓
editor projection / serializer
    ↓
simulation model + execution
    ↓
results / runtime
    ↓
Inspector + Instruments + schematic feedback
```

ReactFlow remains an editor implementation detail. Screen coordinates remain presentation state. The renderer does not own physical truth.

## 13. Implementation sequence

### V2.1 — Canvas-first shell — implemented

- default Library/Inspector/Instruments closed
- remove dashboard-like permanent regions
- compact top bar
- contextual floating surfaces
- canvas owns available space
- retained test IDs and public interaction contracts where possible
- removed a non-functional canvas grid control

### V2.2 — Library — implemented

- visual symbol tiles
- compact categories
- search-first placement
- recent components
- compact example list
- engineering symbol previews

### V2.3 — Inspector — implemented

- contextual selection header
- property groups
- model/port information
- terminal/net context
- direct measurement actions
- real numeric/select property controls

### V2.4 — Instruments — implemented

- contextual open behavior
- waveform/result surfaces
- probe list and removal
- direct trace/result identity
- resize interaction
- probe-to-result mapping

### V2.5 — Simulation interaction — implemented/in validation

- analysis controls remain focused on essential controls
- probe-first workflow
- result-to-schematic context
- simulation uses the same shell

### V2.6 — Polish and acceptance — in progress

- viewport stability
- symbol spacing
- labels
- wiring/junctions
- keyboard behavior
- accessibility
- full browser acceptance
- exact deployed revision acceptance

## 14. Validation gates

V2 is not considered complete because screenshots look better.

Required gates:

- frontend lint/tests/build green
- backend tests green
- deterministic result/probe mapping tests green
- component placement and editing acceptance green
- wiring acceptance green
- analysis acceptance green
- instrument/probe acceptance green
- Live acceptance green
- no unexpected viewport movement
- exact deployed revision passes the relevant browser acceptance suite

Visual review should specifically reject regressions where the UI again becomes a collection of equal-weight panels.

## 15. Success criterion

A useful test is:

> If all secondary surfaces are closed, does the application still look complete and intentional?

The answer must be **yes**.

A second test:

> When a user selects a resistor, does the UI feel like the workspace is revealing the information needed for that resistor, rather than opening another application panel?

The answer must also be **yes**.

## 16. Non-goals

V2 does not introduce:

- a new simulation engine
- a new World Graph
- a new electrical model
- cross-World UI architecture
- mobile-first editing
- persistent telemetry overlays
- a generic SaaS dashboard design system

The goal is a substantially better Electrical World presentation and interaction layer while preserving the established engineering architecture.
