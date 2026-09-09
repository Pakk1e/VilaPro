# Circuit Simulation Platform Roadmap

## Phase 5 — Dynamic Simulation

### Phase 5.1 — Simulation Session / Execution State ✅

- Simulation session identity
- Lifecycle: created → running → completed / failed / cancelled
- Point counting and limits
- Progress calculation
- Cancellation request/state
- Immutable execution snapshots
- Integration with existing DC operating point and DC sweep execution

### Phase 5.2 — Transient Analysis Foundation ✅

The transient execution and result contract is implemented and extended through the dynamic-device work that followed.

Completed increments:

- `transient` analysis type
- Start / stop / step configuration
- Deterministic time-grid generation
- Time-point limit enforcement
- Session integration and cancellation handling
- Per-point failure preservation
- Generic transient result datasets
- Public simulation API export
- Analytical RC validation
- Analytical RL validation
- Coupled RLC analytical validation
- Timestep-refinement validation
- Backend regression coverage

The transient result uses the shared generic dataset architecture:

```text
Transient Result
    ├─ time
    ├─ time_status
    ├─ node_voltages
    ├─ branch_currents
    └─ components
```

### Phase 5.3 — Dynamic State Infrastructure ✅

- Per-component dynamic state
- State initialization
- Previous-step state handling
- Time-step context
- State-safe transient execution integration
- Stateful preparation/acceptance extension point for dynamic devices
- Convergence/error propagation without committing failed-step state
- Immutable per-step state snapshots
- Regression coverage for accepted-state advancement and failed-step preservation

Execution flow:

```text
Previous accepted state
        ↓
TransientStepContext
        ↓
Prepare current-step model
        ↓
Solve
        ↓
Success ─────────→ Accept next state
   │
   └─ Failure ───→ Preserve previous state
```

### Phase 5.4 — Capacitor ✅

The capacitor is implemented as the first concrete dynamic component while preserving the separation between physical component identity, layer-specific representation, and numerical analysis method.

- Canonical electrical relationship: `i = C · dv/dt`
- Backward-Euler companion model
- Capacitance validation (`C > 0`)
- Previous capacitor-voltage state
- Initial capacitor voltage
- Automatic transient state handling
- Capacitor V/I/P result quantities
- RC transient validation
- Electrical-layer representation metadata
- Regression coverage

Backward Euler is an analysis/numerical representation, not the definition of the capacitor.

### Phase 5.5 — Inductor ✅

- Inductor component definition
- Inductance parameter
- Dynamic companion/state equation
- Initial-condition handling
- RL transient validation
- Result quantities V/I/P
- Regression tests

### Phase 5.6 — Time-Varying Sources

- Time-dependent source value representation
- Source evaluation at simulation time
- Voltage/current source waveform support
- Validation
- Tests

### Phase 5.7 — Transient Result Explorer 🔄

#### 5.7A — Generic Dataset Accessors ✅

The generic result model now provides an analysis-independent backend access layer:

- Ordered dataset-name discovery
- Named dataset lookup
- Time/sweep row-series extraction
- Preservation of `None` for failed analysis points
- No coupling to a particular numerical method

Intended presentation flow:

```text
Dataset
   ↓
Series
   ↓
Plot
```

#### Remaining

- Time as X-axis
- Node-voltage plotting
- Branch-current plotting
- Component V/I/P plotting
- Shared response selection
- Failed-point visualization
- Frontend tests

### Phase 5.8 — Dynamic Validation Circuits ✅

Canonical dynamic circuits have been validated in the backend:

- RC charging
- RL response
- RLC response
- Initial-condition cases
- Time-step sensitivity
- Analytical-response comparisons

The next work should expose these validated datasets through the result explorer rather than creating another transient result format.

---

## Phase 5 Current Architecture

The simulation stack now follows:

```text
Component Entity
       ↓
Layer-specific Representation
       ↓
Analysis Model
       ↓
Numerical / Analytical Method
       ↓
Result Model
       ↓
Dataset
       ↓
Series
       ↓
Plot
```

The same component can therefore have different valid representations at different Worlds layers.

For example, a capacitor may eventually be represented as:

```text
Circuit / electrical → i = C · dv/dt
AC electrical       → Z = 1 / (jωC)
Laplace              → I(s) = sC V(s) - C v(0⁻)
Physical             → Q = C V, electric field, stored energy
Material             → dielectric / polarization behavior
Microscopic          → charge carriers and interactions
```

The deeper physical/material/microscopic layers remain future Worlds work.

---

# Long-Term Vision

The same underlying component/entity should remain explorable through progressively deeper layers without coupling the visual model to a particular simulation implementation.

```text
World / Visual Layer
        ↓
Shared Circuit / Component Entity
        ↓
Layer-specific Representation
        ↓
Analysis Model
        ↓
Numerical / Analytical Method
        ↓
Result Model
        ↓
Dataset
        ↓
Series
        ↓
Plot
```
