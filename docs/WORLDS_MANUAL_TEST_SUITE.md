# VilaPro Worlds — Manual Site Test Suite

**Version:** v0.4 Workspace Architecture  
**Purpose:** Repeatable manual acceptance testing of the Worlds UI, circuit construction, simulation setup, numerical results, live simulation, live plotting, Parameter Sweep, transient analysis, AC analysis, and validation.

> **Most important regression:** **T13 — Live AC Smooth Sine Wave**. The live AC instantaneous waveform must be a smooth sine wave, not a triangle or sawtooth.

---

## 1. Test rules

1. Run the tests on the Worlds site, not against code directly.
2. Keep browser zoom at **100%**.
3. Start each test with a clean canvas/new world so previous components cannot affect the result.
4. Use the exact component values and simulation settings in this document.
5. For numerical results, allow normal UI formatting such as `1,000 Ω`, `1 kΩ`, or engineering notation; compare the underlying value, not only the displayed formatting.
6. For every failed test, capture the failure state and record **Actual vs Expected**.
7. Do not treat a successful simulation start as a passing result: verify the actual numerical result or waveform.

## 2. Screenshot rules

Take screenshots from the Worlds site itself. Do not use terminal, code, or developer-tool screenshots.

| Code | Take screenshot from | What must be visible | Example filename |
|---|---|---|---|
| CIR | Worlds canvas | Complete circuit, topology, component names and visible values | `T01_CIR.png` |
| SET | Simulation panel | Analysis and all relevant entered settings | `T01_SET.png` |
| RES | Static result / Result Explorer | Relevant numerical result, phasor data or sweep dataset | `T01_RES.png` |
| PLOT | Result plot / Live Plot | Complete plot, axes, units, legend and enough history | `T08_PLOT.png` |
| ERR | Simulation panel | Exact validation/error message | `T16_ERR.png` |

For circuit screenshots, show the **complete React Flow canvas**. If the Inspector contains the parameter value, include it.  
For setup screenshots, show the **Simulation** panel and the selected analysis/settings.  
For plots, include the axes, units, legend and sample count/history where available.

---

## 3. Circuit connection convention

For a simple series circuit:

**Voltage Source p → Resistor p → Resistor n → Ground g**, and **Voltage Source n → Ground g**.

When a test says `V1 → R1 → Ground`, this is the intended topology.

---

# 4. Basic DC tests

## T01 — Basic 10 V / 1 kΩ DC operating point

**Objective:** Verify the simplest DC operating point and branch-current calculation.

**Circuit:** `V1 → R1 → Ground`

**Exact values:**
- V1 = **10 V**
- R1 = **1 kΩ (1000 Ω)**

**Setup:**
- Simulation mode: **Static**
- Analysis: **DC Operating Point**

**Expected:**
- Resistor/node voltage = **10.000 V**
- R1 current = **0.010 A = 10.000 mA**
- Simulation completes without an error.

**Screenshots:**
- `T01_CIR.png` — complete circuit.
- `T01_SET.png` — DC Operating Point setup.
- `T01_RES.png` — node voltage and resistor/source branch current.

---

## T02 — 12 V resistor divider

**Objective:** Verify a two-resistor multi-node DC solution.

**Circuit:** `V1 → R1 → node M → R2 → Ground`, with V1 negative to Ground.

**Exact values:**
- V1 = **12 V**
- R1 = **1 kΩ**
- R2 = **2 kΩ**

**Expected:**
- Middle node M = **8.000 V**
- Series current = **4.000 mA**
- Voltage across R1 = **4.000 V**
- Voltage across R2 = **8.000 V**

**Screenshots:**
- `T02_CIR.png`
- `T02_SET.png`
- `T02_RES.png` — middle-node voltage and branch currents.

---

## T03 — Capacitor DC equivalent

**Objective:** Verify the documented DC rule that a capacitor is an open circuit.

**Circuit:** `V1 → R1 → C1 → Ground`

**Exact values:**
- V1 = **10 V**
- R1 = **1 kΩ**
- C1 = **100 µF**

**Setup:** DC Operating Point.

**Expected:**
- DC capacitor current ≈ **0 A**
- Node at capacitor top ≈ **10 V**
- R1 current ≈ **0 A**
- Simulation solves successfully.

**Screenshots:** `T03_CIR.png`, `T03_SET.png`, `T03_RES.png`.

---

## T04 — Inductor DC equivalent

**Objective:** Verify the documented DC rule that an inductor is a short circuit.

**Circuit:** `V1 → R1 → L1 → Ground`

**Exact values:**
- V1 = **10 V**
- R1 = **1 kΩ**
- L1 = **100 mH**

**Expected:**
- Series current = **10.000 mA**
- Ideal inductor voltage ≈ **0 V**
- Node between R1 and L1 ≈ **0 V**

**Screenshots:** `T04_CIR.png`, `T04_SET.png`, `T04_RES.png`.

---

# 5. Parameter Sweep tests

## T05 — Resistor Parameter Sweep

**Objective:** Verify the renamed Parameter Sweep UI and generic component-parameter sweep.

**Circuit:** `V1 → R1 → Ground`

**Exact values:**
- V1 = **10 V**
- R1 initial value = **1 kΩ**

**Setup:**
- Analysis: **Parameter Sweep**
- Sweep target: **R1**
- Parameter: **Resistance / R** (use the exact parameter exposed by the UI)
- Start = **500 Ω**
- Stop = **1500 Ω**
- Step = **500 Ω**

**Expected:**
- Three sweep points: **500 Ω, 1000 Ω, 1500 Ω**
- Current at 500 Ω = **20.000 mA**
- Current at 1000 Ω = **10.000 mA**
- Current at 1500 Ω = **6.6667 mA** approximately
- Individual sweep points are preserved.
- The original circuit is not permanently changed by the sweep.

**Screenshots:**
- `T05_CIR.png`
- `T05_SET.png` — target R1 and parameter R.
- `T05_RES.png` — sweep dataset/plot showing all three points.

---

## T06 — Voltage-source Parameter Sweep

**Objective:** Verify that existing source sweeps remain supported.

**Circuit:** `V1 → R1 → Ground`

**Exact values:**
- R1 = **1 kΩ**
- Sweep target = **V1**
- Parameter = **V**
- Start = **0 V**
- Stop = **10 V**
- Step = **2.5 V**

**Expected:**
- Five points: **0, 2.5, 5, 7.5, 10 V**
- R1 current = **0, 2.5, 5, 7.5, 10 mA** respectively
- Individual sweep points are preserved.

**Screenshots:** `T06_CIR.png`, `T06_SET.png`, `T06_RES.png`.

---

# 6. Transient tests

## T07 — RC transient charging

**Objective:** Verify dynamic capacitor state and time-domain output.

**Circuit:** `5 V DC V1 → R1 → C1 → Ground`

**Exact values:**
- V1 = **5 V**
- R1 = **1 kΩ**
- C1 = **100 µF**
- Start = **0 s**
- Stop = **0.50 s**
- Step = **0.01 s**
- Initial capacitor voltage = **0 V**, if exposed by the UI.

The time constant is **τ = R·C = 0.1 s**.

**Expected for the current discrete transient implementation:**
- Capacitor voltage rises monotonically toward 5 V.
- Approximately:
  - Vc(0.10 s) = **3.072 V**
  - Vc(0.20 s) = **4.257 V**
  - Vc(0.30 s) = **4.713 V**
  - Vc(0.50 s) = **4.957 V**
- No unexpected oscillation or flat-line result.

**Screenshots:**
- `T07_CIR.png`
- `T07_SET.png`
- `T07_PLOT.png` — capacitor voltage versus time.

---

## T08 — Transient sine-wave source

**Objective:** Verify time-varying source evaluation and true sinusoidal transient output.

**Circuit:** `V1 → R1 → Ground`

**Exact values:**
- R1 = **1 kΩ**
- Analysis = **Transient**
- Start = **0 s**
- Stop = **4.00 s**
- Step = **0.01 s**
- V1 waveform = **sine**
- Amplitude = **5 V**
- Offset = **0 V**
- Frequency = **1 Hz**
- Phase = **0°**
- Delay = **0 s**

**Expected:**
- Voltage follows a sine wave from **−5 V to +5 V**.
- t = 0 s → approximately **0 V**
- t = 0.25 s → approximately **+5 V**
- t = 0.50 s → approximately **0 V**
- t = 0.75 s → approximately **−5 V**
- t = 1.00 s → approximately **0 V**
- Four complete cycles are visible.

**Screenshots:** `T08_CIR.png`, `T08_SET.png`, `T08_PLOT.png`.

---

# 7. Static AC tests

## T09 — AC resistor: magnitude and phase

**Objective:** Verify basic AC phasor solving with a purely resistive load.

**Circuit:** `AC V1 → R1 → Ground`

**Exact values:**
- Frequency = **1000 Hz**
- Amplitude = **5 V**
- Phase = **0°**
- R1 = **1 kΩ**

**Expected:**
- Source phasor magnitude = **5 V**, phase = **0°**
- R1 current magnitude = **5 mA**
- R1 current phase = **0°** relative to source
- Static AC is a single-frequency operating point. Do not expect a frequency sweep from this test.

**Screenshots:** `T09_CIR.png`, `T09_SET.png`, `T09_RES.png`.

---

## T10 — AC RC phase shift

**Objective:** Verify complex impedance behavior.

**Circuit:** `V1 = 1 V AC → R1 = 1 kΩ → C1 = 1 µF → Ground`; measure the node between R1 and C1.

**Exact values:**
- Frequency = **159.1549 Hz**
- Amplitude = **1 V**
- Phase = **0°**
- R1 = **1 kΩ**
- C1 = **1 µF**

At this frequency, `|Xc| = R`.

**Expected:**
- Capacitor-node voltage magnitude ≈ **0.7071 V**
- Capacitor-node voltage phase ≈ **−45°** relative to source
- AC result contains complex/magnitude/phase information.

**Screenshots:** `T10_CIR.png`, `T10_SET.png`, `T10_RES.png`.

---

## T11 — AC RLC near resonance

**Objective:** Verify a more complicated AC network containing R, L and C.

**Circuit:** `V1 → R1 → L1 → C1 → Ground`

**Exact values:**
- V1 amplitude = **2 V**
- V1 phase = **0°**
- R1 = **100 Ω**
- L1 = **10 mH**
- C1 = **10 µF**
- Frequency = **503.2921 Hz** approximately

This is approximately `1 / (2π√LC)`.

**Expected:**
- Reactive components approximately cancel.
- Total series impedance is close to **100 Ω**.
- Series current magnitude ≈ **20 mA**.
- Series current phase close to **0°**.
- Small numerical differences are acceptable due to the rounded test frequency.

**Screenshots:** `T11_CIR.png`, `T11_SET.png`, `T11_RES.png`.

---

# 8. Live simulation and waveform tests

## T12 — Live DC: stable value and lifecycle

**Objective:** Verify Live lifecycle and stable DC output.

**Circuit:** `V1 = 10 V → R1 = 1 kΩ → Ground`

**Setup:**
- Simulation mode = **Live**
- Analysis = **DC Operating Point**
- V1 = **10 V**
- R1 = **1 kΩ**

**Procedure:**
1. Start Live.
2. Wait until live state appears and several samples are collected.
3. Select the voltage and current signals.
4. Deselect them and confirm the plot responds.
5. Pause.
6. Resume.
7. Stop.

**Expected:**
- Live state updates continuously.
- Voltage remains approximately **10 V**.
- Current remains approximately **10 mA**.
- Sample time increases while running.
- Pause stops progression; Resume continues it; Stop ends the session.
- The live DC trace is stable, not oscillatory.

**Screenshots:** `T12_CIR.png`, `T12_SET.png`, `T12_PLOT.png`.

---

## T13 — Live AC: smooth sine wave — CRITICAL REGRESSION TEST

**Objective:** Verify the specific regression where a sine waveform appeared as a triangle because sparse live samples were being connected directly.

**Circuit:** `AC Voltage Source V1 → R1 → Ground`

**Exact values:**
- R1 = **1 kΩ**
- Simulation mode = **Live**
- Analysis = **AC Analysis**
- Frequency = **0.1 Hz**
- Amplitude = **5 V**
- Phase = **0°**

**Procedure:**
1. Start Live.
2. Wait until enough history is available for at least **3 complete cycles**.
3. In **Plot Signals**, select the **Instantaneous** voltage signal.
4. Keep the Live Plot visible.
5. Capture the full plot.

**Expected:**

### Waveform shape
- The plotted instantaneous voltage must be a **smooth sinusoid**.
- It must **NOT** be a triangle.
- It must **NOT** be a sawtooth.
- It must not look like a sequence of straight rising/falling ramps caused by sparse sample points.

### Exact waveform
- Peak ≈ **+5 V**
- Minimum ≈ **−5 V**
- Period = **10 s** of simulated time
- At 0° phase:
  - t = 0 s → **0 V**
  - t = 2.5 s → **+5 V**
  - t = 5 s → **0 V**
  - t = 7.5 s → **−5 V**
  - t = 10 s → **0 V**

### Phasor vs instantaneous behavior
- Magnitude should remain approximately **5 V**.
- Phase should remain approximately **0°**.
- **Instantaneous** is the signal that varies with sample time.

### Screenshot
- `T13_CIR.png` — circuit.
- `T13_SET.png` — Live AC settings.
- `T13_PLOT.png` — **full Live Plot**, including axes, units, legend and sample count.
- `T13_SIGNALS.png` — Plot Signals selector with Instantaneous selected.

> **PASS CONDITION:** A visually smooth sine wave. If it is triangular, mark T13 **FAIL** even if the numerical peak values are correct.

---

## T14 — Live AC phase test

**Objective:** Verify that source phase changes the reconstructed instantaneous waveform correctly.

Use the same circuit as T13.

**Exact values:**
- Frequency = **0.1 Hz**
- Amplitude = **5 V**
- Phase = **90°**
- R1 = **1 kΩ**

**Expected:**
- Instantaneous waveform starts at approximately **+5 V** at t = 0.
- Waveform remains smooth and sinusoidal.
- Magnitude remains **5 V**.
- Phase remains approximately **90°**.
- Purely resistive current has the same phase as the voltage.

**Screenshots:** `T14_CIR.png`, `T14_SET.png`, `T14_PLOT.png`.

---

## T15 — Live AC RC: magnitude, phase and instantaneous

**Objective:** Verify all three AC representations on a reactive circuit.

**Circuit:** `V1 = 1 V AC → R1 = 1 kΩ → C1 = 1 µF → Ground`

**Exact values:**
- Frequency = **159.1549 Hz**
- Amplitude = **1 V**
- Phase = **0°**
- R1 = **1 kΩ**
- C1 = **1 µF**

**Procedure:**
- Start Live.
- Select relevant voltage/current **Instantaneous**, **Magnitude**, and **Phase** signals.

**Expected:**
- Magnitude values remain stable for fixed frequency.
- Phase values remain stable for fixed frequency.
- Instantaneous values oscillate smoothly.
- Do **not** expect magnitude/phase themselves to oscillate; the time-varying representation is Instantaneous.

**Screenshots:**
- `T15_CIR.png`
- `T15_SET.png`
- `T15_SIGNALS.png` — selected signal types.
- `T15_PLOT.png` — smooth instantaneous waveform and appropriate scale.

---

# 9. Negative / validation tests

## T16 — Invalid AC settings

**Objective:** Verify validation instead of allowing invalid AC execution.

Use any valid circuit with one independent voltage source.

**Procedure:**
1. Select Static or Live AC Analysis.
2. Set Frequency = **0 Hz**.
3. Attempt to run.
4. Set Frequency back to **1000 Hz**.
5. Set Amplitude = **−1 V**.
6. Attempt to run.
7. Restore Amplitude = **1 V**.

**Expected:**
- Invalid configuration is rejected with a clear validation message.
- Invalid configuration does not produce a successful AC result.
- After restoring valid values, AC simulation works again.

**Screenshots:** `T16_CIR.png`, `T16_ERR.png`, `T16_RECOVERY.png`.

---

## T17 — Invalid Parameter Sweep step

**Objective:** Verify Parameter Sweep validation.

**Circuit:** `V1 = 10 V → R1 = 1 kΩ → Ground`

**Setup:**
- Analysis = **Parameter Sweep**
- Target = **R1**
- Parameter = **R**
- Start = **1000 Ω**
- Stop = **2000 Ω**
- Step = **0 Ω**

**Expected:**
- Clear validation error.
- No infinite, empty, or successful invalid sweep.
- Restore Step = **500 Ω** and verify the sweep runs.

**Screenshots:** `T17_CIR.png`, `T17_ERR.png`, `T17_RECOVERY.png`.

---

# 10. Complicated integration test

## T18 — Full mixed RLC transient circuit

**Objective:** Exercise a larger passive network and verify that simulation, result data and plotting remain usable.

**Topology:**

```text
                 ┌── C1 ── Ground
V1 ── R1 ── node A
                 └── R2 ── node B ── L1 ── Ground
```

**Exact values:**
- V1 = **5 V DC**
- R1 = **100 Ω**
- R2 = **100 Ω**
- C1 = **100 µF**
- L1 = **50 mH**
- Analysis = **Transient**
- Start = **0 s**
- Stop = **0.50 s**
- Step = **0.001 s**

**Expected:**
- Simulation completes without singular-matrix or unsupported-component errors.
- Result contains time-series data.
- Node A and node B quantities are available where supported.
- Plot has a real time axis and does not collapse to one point.
- Passive response should settle rather than grow without bound.

**Screenshots:**
- `T18_CIR.png` — complete circuit.
- `T18_SET.png` — transient settings.
- `T18_PLOT.png` — node voltage/current traces.
- `T18_RES.png` — result data.

---

# 11. Final acceptance checklist

- [ ] T01 — DC resistor operating point works.
- [ ] T02 — DC divider gives expected values.
- [ ] T03 — Capacitor behaves as open circuit in DC.
- [ ] T04 — Inductor behaves as short circuit in DC.
- [ ] T05 — Parameter Sweep can target a resistor parameter.
- [ ] T06 — Parameter Sweep can target a voltage-source parameter.
- [ ] T07 — RC transient charging produces the expected rising curve.
- [ ] T08 — Transient sine source produces a true sine wave.
- [ ] T09 — Static AC produces magnitude and phase.
- [ ] T10 — AC RC circuit produces approximately −45° phase at 1/(2πRC).
- [ ] T11 — RLC circuit behaves correctly near resonance.
- [ ] T12 — Live DC is stable and lifecycle controls work.
- [ ] **T13 — Live AC instantaneous waveform is smooth and sinusoidal, NOT triangular.**
- [ ] T14 — Changing AC phase changes the instantaneous waveform.
- [ ] T15 — Live AC magnitude/phase remain phasor quantities while instantaneous varies.
- [ ] T16 — Invalid AC settings are rejected.
- [ ] T17 — Invalid sweep step is rejected.
- [ ] T18 — Larger mixed RLC transient circuit completes and produces usable plots/results.

---

# 12. Test report template

| Test | Pass/Fail | Actual result | Screenshot(s) | Notes / defect |
|---|---|---|---|---|
| T01 | ☐ Pass ☐ Fail | | | |
| T02 | ☐ Pass ☐ Fail | | | |
| T03 | ☐ Pass ☐ Fail | | | |
| T04 | ☐ Pass ☐ Fail | | | |
| T05 | ☐ Pass ☐ Fail | | | |
| T06 | ☐ Pass ☐ Fail | | | |
| T07 | ☐ Pass ☐ Fail | | | |
| T08 | ☐ Pass ☐ Fail | | | |
| T09 | ☐ Pass ☐ Fail | | | |
| T10 | ☐ Pass ☐ Fail | | | |
| T11 | ☐ Pass ☐ Fail | | | |
| T12 | ☐ Pass ☐ Fail | | | |
| T13 | ☐ Pass ☐ Fail | | | |
| T14 | ☐ Pass ☐ Fail | | | |
| T15 | ☐ Pass ☐ Fail | | | |
| T16 | ☐ Pass ☐ Fail | | | |
| T17 | ☐ Pass ☐ Fail | | | |
| T18 | ☐ Pass ☐ Fail | | | |

## Critical regression rule

**T13 is a hard visual acceptance test.** If the Live AC instantaneous plot is triangular/sawtooth instead of a smooth sine wave, record the test as failed regardless of whether the peak and RMS/magnitude values look correct.
