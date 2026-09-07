# Circuit Simulation Platform Roadmap

## Phase 1 — Workspace Architecture

### Goal
Introduce a clear application structure that separates circuit design from simulation while maintaining a shared data model.

### Deliverables

#### Application / Workspace Concept
Create two primary workspaces:

- **Circuit Design Workspace**
  - Schematic editing
  - Component placement
  - Wiring and connectivity management

- **Simulation Workspace**
  - Simulation setup and execution
  - Results inspection
  - Data visualization

#### Navigation
Implement clean navigation between workspaces:

```text
Circuit Design ↔ Simulation
```

Users should be able to move between workspaces without losing context.

#### Shared Circuit Model
Introduce a single source of truth for the circuit.

Benefits:

- Design workspace edits automatically propagate to simulations
- No data duplication
- Easier future feature development

#### Simulation Workspace Overview
Display a compact read-only circuit overview within the simulation workspace, allowing users to quickly verify the simulated circuit without returning to the schematic editor.

---

## Phase 2 — Simulation Architecture

### Goal
Replace the current hard-coded DC simulation request with a flexible simulation framework.

### Deliverables

#### Generic Simulation Configuration

Move from:

```text
Run DC Operating Point
```

to:

```text
Simulation Configuration
    ├─ Analysis Type
    ├─ Settings
    └─ Result Definition
```

#### Analysis Types

Initial support:

- DC Operating Point

Future-ready structure for:

- DC Sweep
- Transient Analysis
- AC Analysis
- Noise Analysis
- Monte Carlo Analysis

#### Simulation Settings

Introduce configurable settings such as:

- Temperature
- Solver options
- Convergence settings
- Analysis-specific parameters

#### Simulation Result Model

Create a generic result model capable of storing outputs from different analysis types.

Structure example:

```text
Simulation Result
    ├─ Metadata
    ├─ Datasets
    ├─ Statistics
    └─ Analysis Information
```

#### Backward Compatibility

Maintain support for the current DC operating-point simulation while migrating to the new architecture.

---

## Phase 3 — DC Sweep

### Goal
Implement a SPICE-style DC Sweep in which one independent DC voltage or current source is varied across a defined range and the circuit response is calculated at every sweep point.

The fundamental result model is:

```text
DC Sweep
    ├─ Independent variable
    │     └─ swept voltage/current source
    │
    └─ Circuit responses
          ├─ node voltages
          ├─ branch currents
          └─ component quantities
```

The sweep value is always the independent X-axis variable. Circuit quantities are dependent Y-axis responses.

### Phase 3A — DC Sweep backend foundation

- `dc_sweep` analysis type
- Sweep configuration
- Validation
- Voltage-source sweep
- Repeated DC operating-point execution
- Sweep result dataset
- Backend tests

### Phase 3B — API + frontend configuration

- Expose DC Sweep through `/simulate`
- Analysis selector
- Voltage/current source selector
- Start / stop / step controls
- Configuration validation messages
- Stale-result handling
- Frontend tests

### Phase 3C — DC Sweep result presentation

#### Sweep Result Model

Present the result as an independent-variable dataset plus circuit-response datasets.

```text
Sweep Result
    ├─ Sweep source
    ├─ Sweep parameter
    ├─ Sweep values
    └─ Response datasets
```

#### Result Table

Provide a table whose first column is the swept source value and whose remaining columns represent selected circuit responses.

Example:

```text
V1      V(node_1)      I(R1)
0 V       0 V            0 A
2 V       2 V           20 mA
4 V       4 V           40 mA
...
```

#### Response Selection

Allow the user to select circuit quantities for plotting, including:

- Node voltages
- Branch currents
- Component voltage/current/power

The X-axis remains the sweep variable.

#### Basic Visualization

Provide a basic plot of:

```text
X = swept source value
Y = selected circuit response
```

#### Failed Sweep Points

Represent individual failed points explicitly rather than discarding them or failing the entire sweep. The result should retain the sweep value, point status, and error information so the frontend can show gaps or failure markers.

#### Tests

Cover:

- Sweep values as the X-axis
- Node-voltage responses
- Branch-current responses
- Response selection
- Correct dataset mapping
- Failed-point representation
- Stale-result behavior

### Phase 3D — DC Sweep completeness

Phase 3D completes DC Sweep as a source-sweep analysis. It does **not** introduce arbitrary component-parameter sweeps under the DC Sweep analysis type.

#### Source Sweep Semantics

Support:

- Voltage-source sweeps
- Current-source sweeps

For every sweep point:

```text
Set source value
      ↓
Run DC operating point
      ↓
Capture circuit response
      ↓
Store result
```

#### Deterministic Sweep Behavior

Define and test:

- Start value is included
- Stop value is included when reachable by the step
- Positive step for ascending sweeps
- Negative step for descending sweeps
- Zero step rejected
- Sweep point limit enforced
- Original circuit/component values are not mutated
- Each point is an independent DC operating-point calculation

#### Multiple Response Quantities

A single sweep execution produces all requested circuit responses. The frontend selects which response to display without rerunning the sweep.

```text
V1 sweep
    ├─ V(node_1)
    ├─ V(node_2)
    ├─ I(R1)
    ├─ I(R2)
    └─ I(V1)
```

#### Per-Point Failure Handling

A failed operating point must be represented as a failed sweep point while allowing other sweep points to complete.

```text
0 V   completed
1 V   completed
2 V   failed
3 V   completed
```

The result must preserve the point order and include enough status/error information for presentation.

#### Scope Boundary

Arbitrary component-parameter or model-parameter sweeps are not part of DC Sweep. If needed later, they should be introduced as a separate **Parametric Sweep** analysis using the same generic dataset infrastructure.

---

## Phase 4 — Visualization Foundation

### Goal
Create a reusable visualization system that works across all present and future simulation types.

### Core Concept

```text
Dataset
   ↓
Series
   ↓
Plot
```

### Architecture

#### Dataset

Raw simulation output.

Examples:

- DC sweep data
- Transient waveform data
- AC frequency response data

#### Series

Derived visualization data.

Examples:

- V(out)
- I(R1)
- Gain
- Phase

#### Plot

Visual representation of one or more series.

Features:

- Multiple series per plot
- Zoom and pan
- Legends
- Axis configuration

### Benefits

This architecture allows future analyses to reuse the exact same visualization infrastructure:

- DC Analysis
- DC Sweep
- Transient Analysis
- AC Analysis
- Noise Analysis

without creating custom plotting implementations for each simulation type.

---

## Phase 5 — New Components

### Goal
Expand the supported component library using the new simulation and visualization foundation.

### Planned Components

#### Passive Components

- Capacitor
- Inductor

#### Semiconductor Components

- Diode

#### Switching Components

- Switches

#### Sources

- Dependent voltage sources
- Dependent current sources

#### Future Expansion

Additional device models can be added using the same architecture.

### Design Principle

Each component should:

1. Define its schematic representation.
2. Define its simulation model.
3. Integrate through the shared circuit model.
4. Work with existing analysis types.
5. Produce data compatible with the generic results and plotting systems.

### Expected Result

New components should plug into the simulation ecosystem without requiring custom frontend or backend implementations for every individual component.

---

# Long-Term Vision

```text
Circuit Design
        ↓
Shared Circuit Model
        ↓
Simulation Configuration
        ↓
Simulation Engine
        ↓
Result Model
        ↓
Dataset
        ↓
Series
        ↓
Plot
```

This architecture provides a scalable foundation for advanced circuit simulation features while keeping the system maintainable and extensible.