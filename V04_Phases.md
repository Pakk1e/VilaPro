# Circuit Simulation Platform Roadmap

## Phase 1 — Workspace Architecture

Completed.

## Phase 2 — Simulation Architecture

Completed.

## Phase 3 — DC Sweep

Completed.

## Phase 4 — Visualization Foundation

Completed.

The reusable Dataset → Series → Plot architecture is in place, including result inspection, circuit summary, response selection, unit switching, and sweep visualization.

---

# Phase 5 — Dynamic Simulation and New Components

### Goal
Extend the simulation platform from static/source-sweep analysis into time-domain simulation, then use that foundation to introduce components with dynamic state.

## Phase 5.1 — Simulation Execution Sessions

**Status: Completed**

Implemented:

- Explicit simulation-session lifecycle
- Session identity and immutable snapshots
- Point limits and progress tracking
- Cancellation requests
- Per-point result recording
- Per-point failure representation
- Integration with DC operating point
- Integration with DC sweep
- Regression coverage

Current backend suite: **54 tests passing**.

## Phase 5.2 — Transient Analysis Foundation

**Status: In progress**

### Goal
Introduce a generic time-domain analysis contract that can later support stateful components such as capacitors and inductors without creating a separate result or plotting architecture.

### 5.2A — Time-domain configuration

Implement:

- `transient` analysis type
- Start time
- Stop time
- Time step
- Deterministic time-point generation
- Positive-step validation
- Stop/start validation
- Point-count limit
- Configuration round-trip support

### 5.2B — Transient result model

Represent transient results using the existing generic result infrastructure:

```text
Transient Result
    ├─ time
    ├─ point status
    ├─ node voltages
    ├─ branch currents
    └─ component quantities
```

The time vector is always the independent X-axis variable.

### 5.2C — Execution integration

Use the simulation session infrastructure for transient execution:

```text
Start session
      ↓
Generate time point
      ↓
Solve circuit state
      ↓
Record result
      ↓
Repeat
      ↓
Complete session
```

Support per-point failure and cancellation in the same way as DC Sweep.

### 5.2D — Stateful device integration

After the transient execution contract is stable, add dynamic device models beginning with:

- Capacitor
- Inductor

These devices will introduce state between time points. The transient solver must preserve the previous state and use the configured time step when constructing the next circuit solve.

### 5.2E — Frontend transient visualization

Reuse the Phase 4 visualization infrastructure:

- Time on the X-axis
- Node voltage/current/component quantities as Y-axis responses
- Same circuit-summary selection model
- Same V / I / P quantity switching where applicable
- Point inspection and failure markers
- Zoom/pan and plot interaction shared with DC Sweep

### Scope boundary

Phase 5.2 initially establishes the transient analysis and dataset/execution contract. A circuit containing only currently supported static components may therefore produce repeated time-domain operating-point snapshots until stateful components are introduced in 5.2D. This is intentional: it separates the transient infrastructure from the dynamic-device implementation.

---

# Phase 5.3 — New Components

After the transient foundation is stable, expand the component library.

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

### Design Principle

Each component should:

1. Define its schematic representation.
2. Define its simulation model.
3. Integrate through the shared circuit model.
4. Work with existing analysis types where physically meaningful.
5. Produce data compatible with the generic result and plotting systems.

---

# Future Analysis Roadmap

Once DC and transient analysis are established:

- AC Analysis
- Parametric Sweep
- Noise Analysis
- Monte Carlo Analysis

These should reuse the same generic configuration, session, result, dataset, series, and plot infrastructure.

---

# Long-Term Vision

```text
Circuit Design
        ↓
Shared Circuit Model
        ↓
Simulation Configuration
        ↓
Simulation Session
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

The architecture should allow new analyses and device models to plug into the simulation ecosystem without requiring custom frontend or result implementations for every individual feature.
