# Worlds Acceptance Test Report

## 1. Purpose

This report records the browser-level acceptance tests for the Worlds simulation workspace. The suite is intended to verify the most important user-facing simulation workflows against the deployed Worlds DEV environment, complementing the lower-level unit/integration tests and the manual test suite.

The automated suite is implemented in:

- `frontend-dev/tests/e2e/acceptance.spec.js`
- `.github/workflows/worlds-acceptance.yml`

The manual test procedure is documented in `docs/WORLDS_MANUAL_TEST_SUITE.md`.

The acceptance workflow also captures a full-page screenshot for each automated acceptance case. These screenshots are published as the `worlds-acceptance-screenshots` GitHub Actions artifact so they can be reviewed for visual correctness and UI/UX quality, not only functional correctness.

## 2. Test Environment

| Item | Value |
|---|---|
| Environment | Worlds DEV |
| Base URL | `https://worlds-dev.vadovsky-tech.com` |
| Runner | Self-hosted `worlds-dev` |
| Browser | Chromium / Playwright |
| Branch | `v0.4/workspace-architecture` |
| Acceptance workflow | `Worlds Acceptance Tests` |

## 3. Acceptance Coverage

| ID | Test | Expected coverage | Functional status | Visual evidence |
|---|---|---|---|---|
| T01 | Basic 10 V / 1 kΩ DC operating point | Build a series circuit and verify the DC result is approximately 10 V and 10 mA | PASS on latest recorded run | Screenshot captured by current suite; review pending next execution |
| T05 | Resistor Parameter Sweep 500/1000/1500 Ω | Select a component parameter, execute the sweep, verify three plotted points and the expected 6.67 mA endpoint | PASS on latest recorded run | Screenshot captured by current suite; review pending next execution |
| T08 | Transient 1 Hz sine source | Execute transient simulation and verify a result plot is produced without browser errors | PASS on latest recorded run | Screenshot captured by current suite; review pending next execution |
| T09 | Static AC resistor phasor result | Execute a 1 kHz AC analysis with 5 V amplitude and verify the AC phasor result view | PASS on latest recorded run | Screenshot captured by current suite; review pending next execution |
| T13 | Live AC instantaneous waveform | Start Live AC and verify the rendered instantaneous waveform contains a dense, smooth sinusoidal trace with multiple direction changes | PASS on latest recorded run | Screenshot captured by current suite; review pending next execution |
| T16 | Invalid AC frequency | Enter zero frequency and verify simulation is rejected/disabled with a validation alert | PASS on latest recorded run | Screenshot captured by current suite; review pending next execution |

Functional PASS does not automatically mean visual PASS. Visual review is a separate acceptance dimension.

## 4. Visual Review Criteria

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

## 5. Validation Notes

### T01 — DC operating point

The test explicitly configures the voltage source to 10 V and the resistor to 1 kΩ before running the simulation. This avoids relying on component defaults and verifies the intended engineering case.

Expected result:

- Voltage: approximately 10 V
- Current: approximately 10 mA

Visual review should confirm that the DC result is easy to find and that voltage/current values are clearly labeled with units.

### T05 — Parameter Sweep

The sweep is performed against the resistor's `R` parameter:

- Start: 500 Ω
- Stop: 1500 Ω
- Step: 500 Ω

The expected sweep therefore contains three points: 500 Ω, 1000 Ω and 1500 Ω. The test verifies the plot contains exactly three points and that the 1500 Ω result is displayed as approximately 6.67 mA.

Visual review should confirm that the selected component and parameter are understandable, the sweep controls are not cramped, and the resulting three-point plot is readable.

### T08 — Transient sine

The test verifies that the transient analysis can be configured and executed through the UI and that a result plot is rendered. Detailed numerical waveform checkpoints remain covered by the manual test suite and lower-level simulation tests.

Visual review should confirm that the transient controls and resulting waveform have a clear hierarchy and that the plot is large enough to interpret.

### T09 — Static AC

The test configures:

- Frequency: 1000 Hz
- Amplitude: 5 V
- Phase: 0°

It verifies that the AC phasor result view is displayed and contains the expected analysis information.

Visual review should confirm that frequency/amplitude/phase controls are comfortably sized and that phasor values are distinguishable from ordinary DC/transient results.

### T13 — Live AC waveform

This is the important regression test for the Live AC plotting work. The test uses a 1 Hz, 5 V source and verifies that the instantaneous plot is rendered with more than 50 line segments and at least two direction changes.

The purpose is to prevent sparse live snapshots from producing a visibly triangular waveform instead of a smooth sinusoid. The frontend reconstructs a dense instantaneous waveform from the AC phasor information and sample time.

Visual review should specifically check:

- smooth sinusoidal shape;
- readable signal labels;
- useful plot dimensions;
- clear Live state;
- sensible selection controls;
- no raw internal signal names exposed to the user.

### T16 — Invalid AC input

A frequency of 0 Hz is invalid for the AC analysis. The test verifies that the UI disables the simulation action and exposes a validation alert rather than submitting an invalid simulation.

Visual review should confirm that the error is immediately understandable and that the disabled Simulate action has an obvious relationship to the invalid frequency field.

## 6. Issues Found During Acceptance Testing

The first acceptance execution exposed several test/implementation mismatches. These were corrected before recording the final result:

1. **T01 used the voltage-source default instead of explicitly setting 10 V.**
   - Corrected the test to set the source value explicitly.

2. **T05 expected the wrong displayed precision for the final sweep value.**
   - The UI displays approximately `6.67 mA`, so the assertion was aligned with the engineering display precision.
   - The test also verifies the sweep contains exactly three plotted points.

3. **T13 used 0.1 Hz for a live waveform regression.**
   - The test did not observe enough simulated waveform evolution within the acceptance timeout.
   - The acceptance case now uses 1 Hz so multiple waveform extrema can be observed reliably while still validating the sinusoidal rendering behavior.

4. **Acceptance runner dependency setup was incomplete.**
   - The workflow was updated to install the Playwright test runner explicitly and ensure Chromium is available.

5. **Visual evidence was not previously published separately.**
   - The acceptance tests now capture a full-page screenshot for each acceptance case.
   - The workflow publishes these screenshots in a dedicated `worlds-acceptance-screenshots` artifact on every run, including successful runs.

These changes improve the reliability of the acceptance suite and make visual/UI/UX review a first-class part of acceptance rather than relying only on functional assertions.

## 7. Latest Recorded Functional Execution

The latest completed acceptance execution before visual-evidence capture was GitHub Actions run **#10** (`Worlds Acceptance Tests`) for commit `d6a699db82dd044aabe93aefe134d266d075bea4`.

The acceptance test step completed successfully and uploaded the Playwright report. The new screenshot-capture implementation has since been committed and triggered a new acceptance run; its job is currently queued on the self-hosted `worlds-dev` runner, so no visual PASS/FAIL judgment has been recorded yet for the new screenshot evidence.

## 8. Visual Acceptance Status

Visual acceptance is intentionally tracked separately from automated functional acceptance.

A screenshot can be:

- **Functional PASS / Visual PASS** — behavior is correct and the UI presentation is also acceptable.
- **Functional PASS / Visual REVIEW** — behavior works, but the screenshot needs human/engineering review for layout, clarity, or UX.
- **Functional FAIL** — behavior itself is incorrect; visual review is secondary until the functional issue is fixed.
- **Visual FAIL** — functionality works, but the presentation has a concrete UI/UX defect that should be corrected.

The first visual review should be performed from the six screenshots produced by the new acceptance run. T13 should receive particular attention because the smooth-sine rendering was a recent regression target.

## 9. Future Improvements

The following improvements are intentionally tracked separately from the functional acceptance work:

- Strengthen T13 with numerical sine-curve fitting rather than only point-density/direction-change checks.
- Expand automated coverage toward the remaining manual cases (T02–T04, T06–T07, T10–T12, T14–T15, T17–T18).
- Add targeted screenshots for important intermediate states when a single final screenshot is insufficient to judge an interaction.
- Run acceptance tests only after the corresponding Worlds DEV deployment and health checks have completed.
- Optimize the self-hosted runner workflow by caching npm dependencies, reusing the installed Playwright browser, avoiding redundant builds, and improving job sequencing.
- Keep workflow-performance work documented separately in `docs/WORKFLOW_OPTIMIZATION.md`.
