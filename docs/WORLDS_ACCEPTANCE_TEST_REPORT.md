# Worlds Acceptance Test Report

## 1. Purpose

This report records the browser-level acceptance tests for the Worlds simulation workspace. The suite is intended to verify the most important user-facing simulation workflows against the deployed Worlds DEV environment, complementing the lower-level unit/integration tests and the manual test suite.

The automated suite is implemented in:

- `frontend-dev/tests/e2e/acceptance.spec.js`
- `.github/workflows/worlds-acceptance.yml`

The manual test procedure is documented in `docs/WORLDS_MANUAL_TEST_SUITE.md`.

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

| ID | Test | Expected coverage | Status |
|---|---|---|---|
| T01 | Basic 10 V / 1 kΩ DC operating point | Build a series circuit and verify the DC result is approximately 10 V and 10 mA | PASS |
| T05 | Resistor Parameter Sweep 500/1000/1500 Ω | Select a component parameter, execute the sweep, verify three plotted points and the expected 6.67 mA endpoint | PASS |
| T08 | Transient 1 Hz sine source | Execute transient simulation and verify a result plot is produced without browser errors | PASS |
| T09 | Static AC resistor phasor result | Execute a 1 kHz AC analysis with 5 V amplitude and verify the AC phasor result view | PASS |
| T13 | Live AC instantaneous waveform | Start Live AC and verify the rendered instantaneous waveform contains a dense, smooth sinusoidal trace with multiple direction changes | PASS |
| T16 | Invalid AC frequency | Enter zero frequency and verify simulation is rejected/disabled with a validation alert | PASS |

## 4. Validation Notes

### T01 — DC operating point

The test explicitly configures the voltage source to 10 V and the resistor to 1 kΩ before running the simulation. This avoids relying on component defaults and verifies the intended engineering case.

Expected result:

- Voltage: approximately 10 V
- Current: approximately 10 mA

### T05 — Parameter Sweep

The sweep is performed against the resistor's `R` parameter:

- Start: 500 Ω
- Stop: 1500 Ω
- Step: 500 Ω

The expected sweep therefore contains three points: 500 Ω, 1000 Ω and 1500 Ω. The test verifies the plot contains exactly three points and that the 1500 Ω result is displayed as approximately 6.67 mA.

### T08 — Transient sine

The test verifies that the transient analysis can be configured and executed through the UI and that a result plot is rendered. Detailed numerical waveform checkpoints remain covered by the manual test suite and lower-level simulation tests.

### T09 — Static AC

The test configures:

- Frequency: 1000 Hz
- Amplitude: 5 V
- Phase: 0°

It verifies that the AC phasor result view is displayed and contains the expected analysis information.

### T13 — Live AC waveform

This is the important regression test for the Live AC plotting work. The test uses a 1 Hz, 5 V source and verifies that the instantaneous plot is rendered with more than 50 line segments and at least two direction changes.

The purpose is to prevent sparse live snapshots from producing a visibly triangular waveform instead of a smooth sinusoid. The frontend reconstructs a dense instantaneous waveform from the AC phasor information and sample time.

### T16 — Invalid AC input

A frequency of 0 Hz is invalid for the AC analysis. The test verifies that the UI disables the simulation action and exposes a validation alert rather than submitting an invalid simulation.

## 5. Issues Found During Acceptance Testing

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

These changes were made to improve the reliability and correctness of the acceptance suite rather than weakening the functional checks.

## 6. Latest Recorded Execution

The latest acceptance execution was GitHub Actions run **#10** (`Worlds Acceptance Tests`) for commit `d6a699db82dd044aabe93aefe134d266d075bea4`.

The acceptance test step completed successfully, and the workflow uploaded the Playwright report. Failure-artifact upload was skipped because the test step succeeded.

Observed execution timing:

- Dependency installation: approximately 6 seconds
- Playwright runner installation: approximately 29 seconds
- Acceptance tests: approximately 35 seconds
- Playwright report upload: approximately 4 seconds

The overall workflow was still completing GitHub's post-job cleanup when the run was inspected; the acceptance test command itself had already completed successfully.

## 7. Interpretation

The automated acceptance suite currently covers the core paths that were recently implemented or changed:

- DC operating-point simulation
- Generic component Parameter Sweep
- Transient simulation
- Static AC analysis
- Live AC plotting
- Invalid-input validation

A passing acceptance run means these workflows can be exercised end-to-end through the deployed Worlds UI without the targeted browser-level regressions detected by this suite.

It does **not** replace the complete manual test suite. The manual suite remains the broader functional reference, including additional DC, transient, AC, Live, mixed-component, and negative test cases.

## 8. Future Improvements

The following improvements are intentionally tracked separately from the functional acceptance work:

- Strengthen T13 with numerical sine-curve fitting rather than only point-density/direction-change checks.
- Expand automated coverage toward the remaining manual cases (T02–T04, T06–T07, T10–T12, T14–T15, T17–T18).
- Run acceptance tests only after the corresponding Worlds DEV deployment and health checks have completed.
- Optimize the self-hosted runner workflow by caching npm dependencies, reusing the installed Playwright browser, avoiding redundant builds, and improving job sequencing.
- Keep workflow-performance work documented separately in `docs/WORKFLOW_OPTIMIZATION.md`.
