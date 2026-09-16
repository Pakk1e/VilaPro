# Testing

## Testing layers

VilaPro uses several levels of verification. Use the smallest level that can prove the change, then rely on the full Worlds acceptance suite for interactive behavior changes.

### Unit/component tests

Use these for deterministic logic, state transformations, parsers, formatters, and isolated UI behavior.

### Build verification

A production build catches compilation, bundling, and dependency problems. It does not prove that the deployed Worlds UI behaves correctly.

### Worlds browser acceptance

Playwright acceptance tests exercise the real Worlds interface. These are the authoritative regression tests for user-visible Worlds behavior.

Important contracts include:

- contextual Library opening and closing
- schematic component placement
- placement outside contextual overlays
- selection and object-local inspection
- property editing through the graph update boundary
- canonical graph-state verification
- port-to-port connections
- contextual Instruments and simulation controls
- electrical example circuits

Prefer stable contracts such as `data-testid`, accessible roles/names, and explicit graph-state assertions. Avoid assertions tied only to incidental CSS, exact pixel positions, or implementation details unless the visual geometry itself is the behavior under test.

## CI acceptance flow

The Worlds acceptance workflow runs on the self-hosted `worlds-dev` runner. It installs frontend dependencies, ensures the Playwright browser environment, runs the acceptance suite, and retains diagnostic artifacts.

On failure, inspect the retained:

- Playwright HTML report
- screenshots
- traces
- test results
- acceptance log

The exact deployed commit SHA should be propagated into post-deployment acceptance so the tested revision is unambiguous.

## Writing a new acceptance test

1. Define the user-visible behavior being protected.
2. Identify the stable UI or graph-state contract.
3. Prepare the workspace through the same contextual UX a user would use.
4. Perform the interaction.
5. Assert both the visible result and, where appropriate, the canonical graph state.
6. Keep setup deterministic and independent of another test's state.
7. Run the focused test, then the relevant full suite.

## Worlds-specific principles

The schematic canvas is the primary workspace. Contextual tools should be opened and closed explicitly in tests rather than assuming a permanent dashboard layout.

The canonical Worlds graph is authoritative. Tests that edit object properties should verify that the update crosses the established state boundary instead of merely checking a local input value.

When a connection is tested, use the application's actual port/handle interaction rather than bypassing the graph interaction with direct state manipulation.

## Failure diagnosis

Do not immediately weaken an assertion because a test fails. First determine whether:

- the product behavior regressed;
- the test uses a stale selector or outdated UX assumption;
- an overlay intercepts an interaction;
- the deployed revision differs from the revision being investigated;
- the runner environment differs from expectations.

Update tests when the product contract intentionally changes; otherwise fix the implementation.
