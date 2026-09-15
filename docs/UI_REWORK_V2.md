# Electrical Workspace UI Rework — V2 Direction

## Status

**V2 interaction redesign is now active.** The previous V2 implementation established a canvas-first shell and contextual surfaces, but that work was primarily a layout migration: the existing Library, Inspector, Simulation, and Instrument UI was redistributed into hideable/resizable regions. That is useful infrastructure, but it is **not sufficient to count as the UI rework**.

The active goal is now a genuine presentation and interaction replacement. The Electrical World must behave like an electronics workbench/instrument rather than the old application split into floating panels.

## 1. Why the direction changed

The first UI rework and its V2 shell improved panel placement, viewport priority, and contextual visibility. However, visual inspection of the resulting composition showed that the underlying interaction model remained recognizably the old application:

- the same application panels remained the primary mental model
- component insertion still behaved like choosing an item from a conventional palette
- simulation remained a panel-centric workflow
- inspection remained a panel-centric workflow
- the top bar still acted as a launcher for application regions
- the canvas was given more space, but was not yet made the place where the product's interaction happens

This is now explicitly rejected.

> **A UI rework is not complete when the old UI can be hidden. It is complete when the user's way of working has changed.**

## 2. Product principle

> **The circuit owns the screen. Tools orbit the circuit.**

The canvas is not the center column of an application dashboard. It is the primary workspace object. The surrounding UI should reveal itself in response to intent, selection, analysis, and measurement.

The default state must feel complete with secondary surfaces closed. A user should be able to understand the product by looking at the circuit and its immediate affordances.

## 3. Interaction model

The active model is:

```text
             CIRCUIT / SCHEMATIC
                      │
       ┌──────────────┼──────────────┐
       ↓              ↓              ↓
    place          select          probe
       │              │              │
       ↓              ↓              ↓
   placement      contextual       instrument
     tool          details          trace
       │              │              │
       └──────────────┴──────────────┘
                      ↓
                  investigate
```

The application should minimize navigation between generic panels. Common actions should begin at the object or canvas where the user is already working.

### Build flow

```text
Add / A
  ↓
Search component
  ↓
Choose symbol
  ↓
Place on canvas
  ↓
Wire / move / rotate
  ↓
Select object to inspect
```

Component insertion is a temporary tool, not a permanent palette dependency.

### Inspect flow

```text
Click component
  ↓
Object becomes the focus
  ↓
Relevant properties and quantities appear
  ↓
Edit directly or measure
```

The Inspector is an object inspector, not a dashboard.

### Measure flow

```text
Run
  ↓
Click node / terminal / component
  ↓
Choose quantity
  ↓
Instrument opens with a meaningful identity
  ↓
Inspect / compare / measure
```

The user should not need to configure a generic result browser for ordinary measurements.

## 4. Visual composition

The visual composition must be redesigned around the interaction model rather than simply restyled.

### Default

```text
┌───────────────────────────────────────────────────────────────┐
│ Lab OS   Electrical          DESIGN       SIMULATE       ◉    │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                                                               │
│                    ┌── R1 ─────┐                              │
│              V1 ───┤           ├─── Vout                     │
│                    └────────────┘                              │
│                           │                                   │
│                          GND                                  │
│                                                               │
│                                                               │
│       compact canvas/tool affordances              status     │
└───────────────────────────────────────────────────────────────┘
```

There should be substantially less chrome than the current implementation. Empty regions should not look like empty cards.

### Selection

Selection should reveal an object-specific surface close to the selected object or at a predictable workspace edge, with the circuit remaining visually dominant.

```text
                 ┌── R1 ─────┐
            ─────┤            ├─────
                 └────────────┘
                       │
                       │     ┌─────────────────┐
                       └─────│ R1  Resistor    │
                             │ 1 kΩ             │
                             │ V  4.82 V        │
                             │ I  4.82 mA       │
                             │ P  23.2 mW       │
                             │                  │
                             │ + Measure        │
                             └─────────────────┘
```

This is a conceptual direction, not a requirement to anchor every panel to an exact screen coordinate.

## 5. Top-level UI responsibilities

The top bar should provide orientation and mode, not act as a panel launcher.

It should prioritize:

- Lab OS / World identity
- Build vs Simulate mode
- current analysis state when relevant
- run state
- a small number of global commands

Library / Inspector / Instruments should no longer be the dominant top-level mental model.

## 6. Temporary tools

### Component placement

The component library becomes an insertion/search tool. Its visual priority is search and recognizable symbols, not category cards.

Desired behavior:

1. invoke placement
2. search or choose a component
3. move the placement preview with the pointer
4. click to place
5. remain in placement mode only when the user explicitly wants repeated placement
6. escape returns to normal selection

The initial implementation may continue to use the existing event boundary for placement, but the visible interaction should evolve toward this model.

### Wiring

Wiring is a first-class canvas action. The user should be able to begin a wire directly from a port and receive clear visual feedback while connecting.

Wires must remain visually stronger than surrounding UI chrome.

## 7. Inspector redesign

The Inspector should be treated as an **object detail surface**.

It should reveal only information relevant to the current object:

- identity
- editable parameters
- ports/terminals
- current simulation quantities when available
- measurement actions
- concise model information when useful

It should avoid generic sections that remain visible regardless of context.

A selected resistor should feel different from a selected terminal, net, or simulation result because the information hierarchy changes with the object.

## 8. Simulation redesign

Simulation should be a workspace mode, not an additional permanent application panel.

### Build mode

Primary actions:

- select
- place
- move
- rotate
- wire
- edit
- delete

### Simulate mode

Primary actions:

- choose analysis
- run / stop
- probe
- inspect
- instrument
- measure

The same schematic remains the central object in both modes.

Analysis controls should be progressively disclosed. The user should see the essential configuration first and only see specialized controls when the selected analysis requires them.

## 9. Instruments redesign

An instrument is a result surface, not a second dashboard.

A waveform should identify itself directly:

```text
V(out)
────────────── waveform ──────────────
```

A current trace should say `I(R1)` rather than `Result 2`.

Multiple traces should be visually comparable without surrounding them with large cards or redundant metadata.

The instrument surface should appear because the user has something meaningful to inspect, and it should return space to the schematic when dismissed.

## 10. Visual language

The visual review standard is now stricter.

Prefer:

- engineering drawing clarity
- strong schematic contrast
- quiet neutral background
- thin, purposeful chrome
- precise alignment
- restrained depth
- meaningful hierarchy
- symbols that read immediately at normal zoom
- short labels and direct manipulation
- whitespace around the circuit

Avoid:

- dashboard cards
- equal-weight panels
- excessive rounded containers
- decorative gradients
- persistent status pills that compete with the schematic
- oversized headers
- repeated section labels
- large empty panel frames
- UI that looks like a collection of web forms

## 11. Visual inspection is a required engineering activity

The implementation must be inspected as a visual product, not only validated by DOM assertions.

Every meaningful UI milestone should review at least:

1. empty workspace
2. first component placement
3. small circuit with multiple components
4. selected component
5. selected terminal / wire
6. simulation setup
7. simulation result / instrument
8. narrow desktop viewport
9. focus mode

The review should explicitly ask:

- Does the circuit visually dominate?
- Can I tell what the primary action is without reading every label?
- Does a panel look like an application region or like context revealed by the object?
- Is the schematic legible at normal zoom?
- Are symbols, labels, ports, and wires aligned and balanced?
- Did any interaction unexpectedly move or zoom the viewport?

DOM acceptance alone is insufficient for this visual milestone.

## 12. Architecture boundary

This remains a presentation/interaction rework.

Do not replace:

- World Graph
- component definitions
- component instances
- serializer
- backend simulation model
- simulation execution
- runtime transport
- result truth

The frontend may introduce presentation state for tool modes, temporary placement, contextual surfaces, and interaction feedback. It must not create a second semantic model.

## 13. Implementation phases

### V2.1 — Canvas shell — completed infrastructure

Established the canvas-first shell and contextual surfaces.

### V2.2 — Library shell — completed infrastructure

Established search, symbol previews, examples, and placement event boundaries.

### V2.3 — Inspector shell — completed infrastructure

Established contextual selection and editable properties.

### V2.4 — Instrument shell — completed infrastructure

Established probes, result mapping, waveform surfaces, and resizing.

### V2.5 — Interaction redesign — **active**

Replace the old panel-oriented interaction model with:

- canvas-first object manipulation
- temporary placement tool
- stronger direct selection affordances
- object-local/contextual inspection
- explicit Build / Simulate mode treatment
- analysis controls that appear progressively
- probe actions originating from objects
- instruments that open around meaningful measurements

### V2.6 — Visual refinement and acceptance

- engineering symbol geometry and spacing
- typography and label placement
- wire/junction clarity
- viewport stability
- responsive behavior
- keyboard interaction
- accessibility
- visual inspection gates
- exact deployed revision acceptance

## 14. Success criteria

A genuine rework is successful when all of the following are true:

1. With every secondary surface closed, the application looks complete.
2. The schematic is unmistakably the primary object.
3. A user can place a component without thinking about a persistent palette.
4. Selecting an object reveals information about that object rather than another generic panel.
5. Simulation feels like entering an instrument mode, not opening another dashboard card.
6. Measurements begin from the circuit and lead naturally to an instrument.
7. The old UI could not be restored simply by opening three old panels.
8. Visual inspection shows a materially different product, not merely a redistributed layout.

## 15. Non-goals

This phase does not introduce:

- a new simulation engine
- a new World Graph
- a new electrical model
- universal UI architecture for future Worlds
- mobile-first circuit editing
- persistent telemetry painted over the schematic

The objective is a **substantially different way of working with the same electrical model**.
