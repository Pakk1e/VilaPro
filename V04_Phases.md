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
Add parameter sweep capabilities and result visualization.

### Deliverables

#### Sweep Configuration

Allow users to sweep:

- Voltage sources
- Current sources
- Component parameters
- Model parameters

Example:

```text
Vin: 0V → 5V
Step: 0.1V
```

#### Multiple Simulation Runs

Generate and execute multiple simulation runs based on sweep parameters.

```text
Run 1
Run 2
Run 3
...
Run N
```

#### Dataset Storage

Store all generated sweep data within the generic simulation result model.

#### Plotting Support

Visualize sweep results using the plotting system.

#### Plot Selection

Allow users to choose:

- Voltage nodes
- Currents
- Component parameters
- Calculated values

for display on plots.

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