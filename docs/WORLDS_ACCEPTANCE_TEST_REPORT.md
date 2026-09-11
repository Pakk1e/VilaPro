# Worlds Acceptance Test Report

## 1. Purpose

This report records the browser-level acceptance tests for the Worlds simulation workspace. The suite verifies the most important user-facing simulation workflows against the deployed Worlds DEV environment, complementing lower-level unit/integration tests and the manual test suite.

The automated suite is implemented in:

- `frontend-dev/tests/e2e/acceptance.spec.js`
- `.github/workflows/worlds-acceptance.yml`

The manual test procedure is documented in `docs/WORLDS_MANUAL_TEST_SUITE.md`.

The acceptance workflow captures visual evidence for each automated acceptance case. Each case produces a full-page screenshot and, where applicable, a focused result/plot screenshot. The screenshots are published as the `worlds-acceptance-screenshots` GitHub Actions artifact so they can be reviewed for visual correctness and UI/UX quality, not only functional correctness.

## 2. Test Environment

| Item | Value |
|---|---|
| Environment | Worlds DEV |
| Base URL | `https://worlds-dev.vadovsky-tech.com` |
| Runner | Self-hosted `worlds-dev` |
| Browser | Chromium / Playwright |
| Branch | `v0.4/workspace-architecture` |
| Acceptance workflow | `Worlds Acceptance Tests` |
| Latest acceptance run | #25 |
| Latest deployment run | #132 |

## 3. Acceptance Coverage

| ID | Test | Expected coverage | Functional status | Visual status |
|---|---|---|---|---|
| T01 | Basic 10 V / 1 kΩ DC operating point | Build a series circuit and verify the DC result is approximately 10 V and 10 mA | PASS | PASS |
| T05 | Resistor Parameter Sweep 500/1000/1500 Ω | Select a component parameter, execute the sweep, verify three plotted points and the expected 6.67 mA endpoint | PASS | **NEEDS IMPROVEMENT** |
| T08 | Transient response plot | Execute transient simulation and verify a result plot is produced without browser errors | PASS | **NEEDS IMPROVEMENT** |
| T09 | Static AC resistor phasor result | Execute a 1 kHz AC analysis with 5 V amplitude and verify the AC phasor result view | PASS | **NEEDS IMPROVEMENT** |
| T13 | Live AC instantaneous waveform | Start Live AC and verify the rendered instantaneous waveform contains a dense, smooth sinusoidal trace with multiple direction changes | PASS | PASS with minor UX notes |
| T16 | Invalid AC frequency | Enter zero frequency and verify simulation is rejected/disabled with a validation alert | PASS | PASS with minor UX note |

Functional PASS does not automatically mean visual PASS. Visual review is a separate acceptance dimension.

## 4. Visual Evidence

The complete screenshot set is retained with the corresponding GitHub Actions run as the `worlds-acceptance-screenshots` artifact. The artifact contains both full-page UI captures and focused plot captures where a plot is the primary visual output.

**Latest visual evidence run:** GitHub Actions `Worlds Acceptance Tests` run #25, commit `3408f47f86c0ca2f48352a5c114f5f833b607f97`.

urlAcceptance run #25https://github.com/Pakk1e/VilaPro/actions/runs/34597479971

urlScreenshot artifact for run #25https://github.com/Pakk1e/VilaPro/actions/runs/34597479971/artifacts/10262860776

The representative screenshots below are the visual evidence reviewed during this acceptance pass. The artifact should be treated as the authoritative complete screenshot set.

### T01 — DC operating point

**Visual verdict: PASS.**

The circuit, Static execution mode, analysis selection, and result tables form a clear left-to-right workflow. User-facing labels and engineering values are readable, and voltage/current values are presented with units.

### T05 — Parameter Sweep

**Visual verdict: NEEDS IMPROVEMENT.**

The latest screenshot now shows a meaningful `I(Resistor 1)` response with three sweep points rather than the previous irrelevant ground-voltage series. This is a clear visualization improvement.

Remaining UX issues:

- the X-axis is still labelled only `Sweep`, rather than the actual swept parameter (`Resistance (Ω)`);
- the focused plot has limited horizontal room and the rightmost sweep point is visually close to the crop boundary;
- the response is technically clear but could explain the swept parameter and response more directly.

### T08 — Transient response

**Visual verdict: NEEDS IMPROVEMENT.**

The latest focused screenshot shows a clean, readable transient plot with a time axis and a stable response. However, the captured source is still the current DC source representation, so this does not validate the sine-source transient case from the manual suite.

The automated case is intentionally named **transient response plot** and does not claim sine-source coverage. A true sine-source acceptance case should be restored once waveform configuration is exposed in the Worlds UI.

### T09 — Static AC phasor

**Visual verdict: NEEDS IMPROVEMENT.**

The AC result card is visually clean and the frequency, excitation magnitude, excitation phase, magnitude, phase, real, and imaginary values are clearly separated.

The screenshot still exposes two current rows with the same user-facing label (`I(Node 2 → Ground)`) even though they represent different branch/polarity contexts. The table also extends horizontally beyond the focused screenshot crop, which makes the rightmost information less convenient to inspect.

The AC result presentation should eventually provide unique current measurement identities, for example by including the component/branch name or polarity context, and should improve horizontal table handling.

### T13 — Live AC

**Visual verdict: PASS with minor UX notes.**

The focused plot is visibly smooth and sinusoidal, not triangular. It contains the expected continuous curvature and multiple direction changes. This confirms the dense waveform reconstruction is working visually.

The full-page evidence also shows the Live state, signal-selection controls, and instantaneous measurements together. Minor observations remain around signal-card label truncation and available plot space.

### T16 — Invalid AC frequency

**Visual verdict: PASS with minor UX note.**

The invalid `0 Hz` input and validation state are visible and understandable. The simulation action is blocked instead of allowing an invalid AC request.

## 5. Visual Review Criteria

For every captured screenshot, review the UI from a user-facing perspective in addition to checking whether the test assertions passed.

### Layout and hierarchy

- Is the primary task/result immediately obvious?
- Are simulation controls, results, and the circuit workspace arranged logically?
- Is there unnecessary empty space or visual crowding?
- Are important controls/results above the fold where practical?

### Readability

- Are labels, values, units, and headings readable at the captured viewport size?
- Are engineering values presented with sensible precision?
- Are controls wide enough for their labels and values?
- Are plots large enough to understand without guessing?

### Simulation-specific clarity

- Does the circuit remain visually understandable after simulation?
- Does the result plot communicate what is being plotted, including axes/units where appropriate?
- Are AC magnitude, phase, and instantaneous values clearly distinguished?
- Does Live AC look like a smooth sinusoid rather than a sparse/triangular approximation?
- Does Parameter Sweep clearly communicate the swept parameter and plotted relationship?
- Are validation errors visible, understandable, and positioned close enough to the relevant control?

### Interaction and state

- Is the active Static/Live mode obvious?
- Is the selected analysis obvious?
- Are disabled controls visually understandable?
- Does the UI clearly communicate running, completed, and stopped states?
- Are there controls or panels that appear interactive but are not?

### General UI/UX quality

- Consistent spacing and alignment
- No overlapping or clipped content
- No awkward text wrapping
- No raw internal identifiers where a user-facing label is expected
- No unexplained icons or controls
- Sensible responsive behavior at the acceptance viewport

## 6. Validation Notes

### T01 — DC operating point

The test explicitly configures the voltage source to 10 V and the resistor to 1 kΩ before running the simulation. This avoids relying on component defaults.

Expected result:

- Voltage: approximately 10 V
- Current: approximately 10 mA

### T05 — Parameter Sweep

The sweep is performed against the resistor's `R` parameter:

- Start: 500 Ω
- Stop: 1500 Ω
- Step: 500 Ω

The expected sweep therefore contains three points: 500 Ω, 1000 Ω and 1500 Ω. The test verifies the plot contains exactly three points and that the 1500 Ω result is displayed as approximately 6.67 mA.

### T08 — Transient response

The current automated acceptance case verifies that transient analysis can be configured and executed through the UI and that a result plot is rendered. It intentionally does not claim to validate a sine source because the current UI does not expose waveform configuration.

Detailed transient numerical checkpoints and the intended sine-source case remain covered by the manual test suite and lower-level simulation tests until waveform configuration is exposed in Worlds.

### T09 — Static AC

The test configures:

- Frequency: 1000 Hz
- Amplitude: 5 V
- Phase: 0°

It verifies that the AC phasor result view is displayed and that raw solver `Variable(name=...)` identifiers are absent from the user-facing result view.

### T13 — Live AC waveform

This is the important regression test for the Live AC plotting work. The test uses a 1 Hz, 5 V source and verifies that the instantaneous plot is rendered with more than 50 line segments and at least two direction changes.

The purpose is to prevent sparse live snapshots from producing a visibly triangular waveform instead of a smooth sinusoid. The frontend reconstructs a dense instantaneous waveform from the AC phasor information and sample time.

### T16 — Invalid AC input

A frequency of 0 Hz is invalid for the AC analysis. The test verifies that the UI blocks invalid simulation and exposes a validation alert rather than submitting an invalid simulation.

## 7. Issues Found During Acceptance Testing

The acceptance process has exposed both functional/test issues and visual/UI issues. Functional mismatches were corrected before the corresponding tests were considered passing.

1. **T01 used the voltage-source default instead of explicitly setting 10 V.**
   - Corrected the test to set the source value explicitly.

2. **T05 expected the wrong displayed precision for the final sweep value.**
   - The UI displays approximately `6.67 mA`, so the assertion was aligned with the engineering display precision.
   - The test also verifies the sweep contains exactly three plotted points.

3. **T13 used 0.1 Hz for a live waveform regression.**
   - The test did not observe enough simulated waveform evolution within the acceptance timeout.
   - The acceptance case now uses 1 Hz so multiple waveform extrema can be observed reliably while still validating sinusoidal rendering.

4. **Acceptance runner dependency setup was incomplete.**
   - The workflow was updated to install the Playwright test runner explicitly and ensure Chromium is available.

5. **Visual evidence was initially not available as a dedicated artifact.**
   - The workflow now captures and uploads acceptance screenshots on successful runs as well as failed runs.
   - Focused plot/result screenshots are captured for tests where the visual output is the important evidence.

6. **Parameter Sweep visualization was initially not meaningful.**
   - The result explorer was changed so the sweep defaults toward the swept component/response rather than an irrelevant ground-voltage series.
   - Visual review confirms the response is now meaningful, while axis/plot labelling remains an improvement area.

7. **Transient sine acceptance was not actually a sine-source UI test.**
   - The acceptance case was renamed/narrowed to transient response plot rendering rather than making a false visual claim.
   - A true sine-source acceptance test remains a follow-up once waveform configuration is available in the UI.

8. **Static AC current labels can be ambiguous.**
   - Visual review continues to identify duplicate-looking current labels in the AC result table. This remains a UX follow-up.

9. **Acceptance test expectations were temporarily stale after result-selection improvements.**
   - T05 was updated to assert the new `I(Resistor 1)` response.
   - T08 was updated to assert the new `V(Resistor 1)` transient response.
   - The latest acceptance run passed all six automated acceptance cases.

## 8. Latest Acceptance Execution

The latest automated acceptance execution is GitHub Actions `Worlds Acceptance Tests` run **#25**, commit `3408f47f86c0ca2f48352a5c114f5f833b607f97`.

urlWorlds Acceptance run #25https://github.com/Pakk1e/VilaPro/actions/runs/34597479971

The run completed successfully:

- T01 PASS
- T05 PASS
- T08 PASS
- T09 PASS
- T13 PASS
- T16 PASS
- screenshot artifact upload PASS
- failure artifact upload was not required

The corresponding Worlds DEV deployment run **#132** also completed successfully, including the deployment health checks and the full browser smoke/authenticated audit.

urlWorlds DEV deployment run #132https://github.com/Pakk1e/VilaPro/actions/runs/34597479944

The screenshot artifact for acceptance run #25 was downloaded and visually reviewed. The visual review confirms the Live AC waveform is smooth, the Parameter Sweep now plots a meaningful resistor current response, the transient plot renders correctly, and the AC result view no longer exposes raw solver variable representations. The remaining visual findings are documented above as explicit UX improvement items rather than being hidden by the functional PASS status.

## 9. Acceptance Interpretation

Worlds acceptance has two independent dimensions:

- **Functional acceptance** — the workflow behaves correctly and automated assertions pass.
- **Visual/UX acceptance** — the rendered interface and visualization make sense to a human user and present the engineering information clearly.

A test should not be considered fully accepted merely because Playwright reports `PASS`. A visual defect can keep an otherwise functional test at `NEEDS IMPROVEMENT` until the UI is corrected.

This distinction is particularly important for simulation software because a technically correct dataset can still be presented as an incorrect, ambiguous, or misleading visualization.

## 10. Future Improvements

- Strengthen T13 with numerical sine-curve fitting rather than only point-density/direction-change checks.
- Add true automated sine-source transient coverage once waveform configuration is exposed in the Worlds UI.
- Improve Parameter Sweep axis/series labelling so the swept parameter and response are immediately obvious.
- Make AC current measurement labels uniquely identify their branch/component and polarity context.
- Improve horizontal handling of wide AC result tables.
- Improve signal-card sizing/truncation in Live mode.
- Expand automated coverage toward the remaining manual cases (T02–T04, T06–T07, T10–T12, T14–T15, T17–T18).
- Add targeted screenshots for important intermediate states when a single final screenshot is insufficient to judge an interaction.
- Run acceptance tests only after the corresponding Worlds DEV deployment and health checks have completed.
- Optimize the self-hosted runner workflow by caching npm dependencies, reusing the installed Playwright browser, avoiding redundant builds, and improving job sequencing.
- Keep workflow-performance work documented separately in `docs/WORKFLOW_OPTIMIZATION.md`.
