# Worlds Acceptance Test Report

## 1. Purpose

This report records browser-level acceptance testing for the Worlds simulation workspace. The suite verifies important user-facing simulation workflows against Worlds DEV, complementing unit/integration tests and the manual test suite.

Automated suite:

- `frontend-dev/tests/e2e/acceptance.spec.js`
- `.github/workflows/worlds-acceptance.yml`

Manual procedure: `docs/WORLDS_MANUAL_TEST_SUITE.md`.

The acceptance workflow captures a full-page screenshot for every automated case and focused result/plot screenshots where visual output is important. Screenshots are published as the `worlds-acceptance-screenshots` GitHub Actions artifact for functional and UI/UX review.

## 2. Test Environment

| Item | Value |
|---|---|
| Environment | Worlds DEV |
| Base URL | `https://worlds-dev.vadovsky-tech.com` |
| Runner | Self-hosted `worlds-dev` |
| Browser | Chromium / Playwright |
| Branch | `v0.4/workspace-architecture` |
| Acceptance workflow | `Worlds Acceptance Tests` |
| Latest reviewed acceptance run | #27 |
| Latest deployment | #134 |

## 3. Acceptance Coverage

| ID | Test | Functional | Visual |
|---|---|---|---|
| T01 | Basic 10 V / 1 kΩ DC operating point | PASS | PASS |
| T05 | Resistor Parameter Sweep 500/1000/1500 Ω | PASS | **NEEDS IMPROVEMENT** |
| T08 | Transient response plot | PASS | **NEEDS IMPROVEMENT** |
| T09 | Static AC resistor phasor result | PASS | **NEEDS IMPROVEMENT** |
| T13 | Live AC instantaneous waveform | PASS | PASS with minor UX notes |
| T16 | Invalid AC frequency | PASS | PASS with minor UX note |

Functional PASS does not automatically mean visual PASS. Visual review is a separate acceptance dimension.

## 4. Visual Evidence

The complete screenshot set is retained with the acceptance run as the `worlds-acceptance-screenshots` artifact.

**Latest reviewed visual evidence:** run #27, commit `a0b4a927fbe462ef753c5ed3e0e7ee65c772c4d9`.

urlAcceptance run #27https://github.com/Pakk1e/VilaPro/actions/runs/34598394560

urlScreenshot artifact for run #27https://github.com/Pakk1e/VilaPro/actions/runs/34598394560/artifacts/10262807292

### T01 — DC operating point

**Visual verdict: PASS.** The circuit, Static mode, analysis selection, and result tables form a clear workflow. User-facing labels and engineering values are readable and include units.

### T05 — Parameter Sweep

**Visual verdict: NEEDS IMPROVEMENT.** The plot now shows a meaningful `I(Resistor 1)` response with three sweep points instead of the previous irrelevant ground-voltage series.

Remaining issues are that the X-axis is still labelled only `Sweep` instead of `Resistance (Ω)`, and the focused plot has limited horizontal room. The response is understandable but could communicate the swept parameter more directly.

### T08 — Transient response

**Visual verdict: NEEDS IMPROVEMENT.** The transient plot is clean and readable, with a time axis and stable response. The current UI still represents the source as DC, so this does not validate the sine-source transient case from the manual suite.

The automated case is intentionally limited to transient plot rendering. A true sine-source acceptance case should be restored once waveform configuration is exposed in Worlds.

### T09 — Static AC phasor

**Visual verdict: NEEDS IMPROVEMENT.** Frequency, excitation magnitude/phase, and phasor magnitude/phase/real/imaginary values are clearly separated. However, two current rows still have the same user-facing label (`I(Node 2 → Ground)`) despite representing different branch/polarity contexts, and the wide table is inconvenient to inspect in the focused viewport.

### T13 — Live AC

**Visual verdict: PASS with minor UX notes.** The focused plot is visibly smooth and sinusoidal rather than triangular, with continuous curvature and multiple direction changes. The full-page capture also shows Live state, signal selection, and instantaneous measurements. Minor issues remain around signal-card truncation and available plot space.

### T16 — Invalid AC frequency

**Visual verdict: PASS with minor UX note.** The invalid `0 Hz` state and validation feedback are visible and the simulation action is blocked.

## 5. Visual Review Criteria

Review every screenshot for:

- clear layout and hierarchy;
- readable labels, values, units, and controls;
- meaningful plot axes, units, and series selection;
- clear Static/Live and running/completed/error states;
- no raw solver identifiers where user-facing labels are expected;
- no clipped, overlapping, or unexplained content;
- sensible simulation-specific presentation of DC, transient, AC, Live AC, and Parameter Sweep results.

## 6. Validation Notes

### T01 — DC operating point

The test explicitly sets 10 V and 1 kΩ before simulation. Expected result is approximately 10 V and 10 mA.

### T05 — Parameter Sweep

The resistor `R` parameter is swept from 500 Ω to 1500 Ω in 500 Ω steps. The test verifies three plotted points and an endpoint of approximately 6.67 mA.

### T08 — Transient response

The automated case verifies transient setup, execution, and result-plot rendering. It deliberately does not claim sine-source coverage because waveform configuration is not exposed in the current UI.

### T09 — Static AC

The test configures 1000 Hz, 5 V amplitude, and 0° phase. It verifies the AC phasor result view and that raw `Variable(name=...)` solver representations are absent.

### T13 — Live AC waveform

The regression uses a 1 Hz, 5 V source. The instantaneous plot must contain more than 50 line segments and at least two direction changes, preventing sparse live snapshots from rendering as a triangular approximation.

### T16 — Invalid AC input

Frequency 0 Hz is invalid. The UI must block simulation and expose a validation alert.

## 7. Issues Found During Acceptance Testing

1. T01 originally relied on the voltage-source default; the test now sets 10 V explicitly.
2. T05 originally expected the wrong display precision; the assertion now matches the displayed 6.67 mA and checks exactly three sweep points.
3. T13 originally used 0.1 Hz; it now uses 1 Hz so waveform evolution is observable within the acceptance timeout.
4. The acceptance runner now installs Playwright explicitly and ensures Chromium is available.
5. Acceptance screenshots are now uploaded as a dedicated artifact, including focused plot/result captures.
6. Parameter Sweep default visualization was changed from an irrelevant ground-voltage series to the swept resistor response. Axis labelling remains a UX improvement item.
7. T08 was narrowed from a claimed sine-source test to transient plot rendering because waveform configuration is not currently exposed in the UI.
8. Static AC current labels remain ambiguous when different branch/polarity contexts receive the same displayed label.
9. T05 and T08 assertions became stale after result-series selection improvements; T05 now expects `I(Resistor 1)`, while T08 now asserts transient plot semantics (`versus Time (s)`) instead of depending on a specific valid response series.

## 8. Latest Acceptance Execution

The latest reviewed automated acceptance execution is run **#27**, commit `a0b4a927fbe462ef753c5ed3e0e7ee65c772c4d9`.

urlWorlds Acceptance run #27https://github.com/Pakk1e/VilaPro/actions/runs/34598394560

All six acceptance cases passed, screenshot upload passed, and no failure artifact was required.

The corresponding Worlds DEV deployment run **#134** also completed successfully, including deployment health checks and the full browser smoke/authenticated audit.

urlWorlds DEV deployment run #134https://github.com/Pakk1e/VilaPro/actions/runs/34598394487

The screenshot artifact was downloaded and visually reviewed. The review confirms the smooth Live AC waveform, meaningful Parameter Sweep response, readable transient plot, and removal of raw solver variable representations from the AC result view. Remaining visual findings are explicitly recorded as UX improvements rather than hidden by functional PASS status.

## 9. Acceptance Interpretation

Worlds acceptance has two independent dimensions:

- **Functional acceptance** — automated behavior and assertions pass.
- **Visual/UX acceptance** — the rendered interface communicates engineering information clearly and correctly to a human user.

A functional PASS therefore does not automatically imply a visual PASS.

## 10. Future Improvements

- Strengthen T13 with numerical sine-curve fitting.
- Add true automated sine-source transient coverage when waveform configuration is exposed in Worlds.
- Improve Parameter Sweep axis/series labelling.
- Make AC current measurement labels uniquely identify branch/component and polarity context.
- Improve horizontal handling of wide AC result tables.
- Improve Live signal-card sizing/truncation.
- Expand automated coverage toward remaining manual cases T02–T04, T06–T07, T10–T12, T14–T15, T17–T18.
- Add targeted screenshots for important intermediate interaction states.
- Sequence acceptance tests after deployment/health checks.
- Optimize self-hosted runner workflow through dependency/browser caching and avoiding redundant builds.
- Keep workflow-performance work documented in `docs/WORKFLOW_OPTIMIZATION.md`.
