# Circuit Simulation Platform Roadmap

## Phase 5 — Simulation Runtime & Static/Live Architecture

### 5.1 — Simulation Session / Execution State ✅

- Simulation session identity
- Lifecycle: created → running → completed / failed / cancelled
- Point counting and limits
- Progress calculation
- Cancellation request/state
- Immutable execution snapshots
- Integration with existing DC operating point and DC sweep execution

### 5.2 — Transient Analysis Foundation ✅

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

### 5.3 — Dynamic State Infrastructure ✅

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

### 5.4 — Capacitor ✅

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

### 5.5 — Inductor ✅

- Inductor component definition
- Inductance parameter
- Dynamic companion/state equation
- Initial-condition handling
- RL transient validation
- Result quantities V/I/P
- Regression tests

### 5.6 — Time-Varying Sources

- Time-dependent source value representation
- Source evaluation at simulation time
- Voltage/current source waveform support
- Validation
- Tests

### 5.7 — Transient Result Explorer ✅

#### 5.7A — Generic Dataset Accessors ✅

The generic result model now provides an analysis-independent backend access layer:

- Ordered dataset-name discovery
- Named dataset lookup
- Time/sweep row-series extraction
- Preservation of `None` for failed analysis points
- No coupling to a particular numerical method

#### 5.7B — Shared Series Factory ✅

- Canonical `SimulationSeries` model
- Factory conversion from generic result datasets
- Stable series IDs and labels
- Quantity/unit/source metadata
- Selection and quantity filtering
- Regression coverage

#### 5.7C — Plot Model and Factory ✅

- Immutable `SimulationPlot`
- Plot configuration and series styles
- Canonical result-to-plot conversion
- Direct plot construction from series
- Voltage/current presets
- Regression coverage

#### 5.7D — Frontend Visualization Boundary ✅

- JSON-compatible visualization payload
- Single-plot and multi-plot serialization
- Rejection of unsupported values
- Visualization regression coverage

#### 5.7E — Simulation Service Integration ✅

- Visualization available from `SimulationResponse`
- Standard voltage/current plot helpers
- Existing simulation result fields preserved

#### 5.7F — Public API Contract ✅

- Stable simulation response envelope
- Visualization payload exposed from `/simulate`
- CORS/preflight handling for the Worlds frontend
- API contract regression coverage

#### 5.7G — Frontend Result Explorer ✅

The existing Worlds simulation workspace now consumes the shared visualization contract without introducing a parallel result format.

- Time as the transient X-axis
- Node-voltage plotting
- Branch-current plotting
- Component V/I/P plotting
- Shared response selection
- Failed-point preservation/visualization
- Result-to-circuit selection bridge
- DC Operating Point backward compatibility
- DC Sweep backward compatibility
- Frontend model regression coverage
- Simulation execution/result lifecycle handling

The frontend work extends the existing Worlds UI. No parallel circuit editor or simulation workspace is created.

Existing frontend architecture:

```text
WorldsShellPage
      ↓
WorldCanvas / WorldNode / JunctionNode / CircuitEdge
      ↓
worldGraphSerializer
      ↓
SimulationPanel
      ↓
SimulationSetup / ResultExplorer
      ↓
POST /simulate
      ↓
SimulationService
      ↓
SimulationResultModel
      ↓
Series → Plot → Visualization payload
```

DC Operating Point and DC Sweep remain backward compatible. Transient is an additional analysis using the same simulation panel and result-explorer architecture.

### 5.8 — Dynamic Validation Circuits ✅

Canonical dynamic circuits have been validated in the backend:

- RC charging
- RL response
- RLC response
- Initial-condition cases
- Time-step sensitivity
- Analytical-response comparisons

The validated datasets are exposed through the existing result explorer rather than through another transient result format.

### 5.9 — Static vs Live Simulation Architecture 🔄

Static and Live are execution modes, independent of the electrical analysis type or future Worlds layer.

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

The intended model is that the same analysis may eventually support either mode where meaningful:

```text
                 Static       Live
DC                  ✓           ✓
Transient           ✓           ✓
AC                  ✓           ✓
Future layers       ✓           ✓
```

Static remains the current request/response-oriented engineering analysis workflow:

```text
Frontend → simulation request → Backend → complete result
                                      ↓
                              Dataset / Series / Plot
                                      ↓
                              Tables / measurements
```

Live is a long-running execution workflow:

```text
Frontend → create/start session → Backend
Frontend ⇐════ live updates ═════ Backend
                                  ↓
                              Simulation Runtime
```

The Live architecture must support:

- Independent simulation session lifecycle
- Start / stop / pause control
- Streaming or subscription-based result/state updates
- Sampling/aggregation between solver rate and UI update rate
- Current simulation state in addition to accumulated history
- Clean cancellation and failure propagation
- Future runtime parameter/control updates

The Live runtime is analysis-independent and layer-independent. Electrical DC/AC are initial consumers, but the architecture must be able to support future Thermal, Mechanical, Control, Fluid, and multi-layer Worlds simulations without creating a separate Live architecture for each layer.

The UI direction is to expose Static and Live as distinct top-level simulation modes. Static uses the existing Result Explorer, plots, tables, measurements, and export workflow. Live will use a dedicated live workspace focused on running state, meters, waveforms, component state, controls, and streaming data.

### 5.10 — Live Simulation Runtime 🔄

Implement the backend/frontend execution boundary for Live without changing the existing Static result contract.

Planned increments:

- Analysis-independent live session model
- Live execution state separate from static result datasets
- Backend long-running simulation execution
- Frontend session creation/start/stop/pause lifecycle
- Live update transport
- Result/state sampling policy
- Frontend live-state store
- Regression and lifecycle tests

### 5.11 — Live DC 🔜

Use DC as the first complete Live implementation because it validates the runtime and transport architecture without introducing AC-specific numerical complexity.

- Live DC execution
- Live voltage/current state
- Live meters
- Live update stream
- Stop/pause behavior
- Frontend Live DC visualization

### 5.12 — Live AC 🔜

After the Live runtime is proven with DC, implement AC as a Live-capable electrical analysis.

- AC excitation model
- Frequency, amplitude, and phase
- Complex/phasor electrical quantities where appropriate
- Live waveform/state representation
- Voltage/current magnitude and phase
- Frontend live AC visualization

Static AC frequency sweep/Bode analysis is a separate capability that can reuse the AC electrical representations and shared result infrastructure after the Live AC foundation exists.

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
Execution Mode
   ┌───┴────┐
 Static    Live
   │         │
   ↓         ↓
Numerical  Simulation
Method     Runtime / State
   │         │
   └────┬────┘
        ↓
 Result / Live State Model
        ↓
 Dataset / Stream
        ↓
 Series / Live Views
        ↓
 Plot / Live Visualization
        ↓
 Existing Worlds Frontend
```

Static results continue to use the generic Dataset → Series → Plot architecture. Live execution introduces a separate current-state/stream boundary rather than forcing a running simulation into a static result table.

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

Static and Live are execution modes available across those layers rather than properties of one particular analysis:

```text
World / Visual Layer
        ↓
Shared Circuit / Component Entity
        ↓
Layer-specific Representation
        ↓
Analysis Model
        ↓
Execution Mode
   ┌────┴────┐
 Static     Live
   │          │
   ↓          ↓
Results    Runtime State
   │          │
   └────┬─────┘
        ↓
Visualization / API
        ↓
Worlds UI
```
