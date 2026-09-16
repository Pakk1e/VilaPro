# Worlds Acceptance Matrix

This document maps the important Worlds user behaviors to the automated browser contracts that protect them. Test filenames are the primary pointers; inspect the current test suite before changing a selector or contract.

| Behavior | Verification | Primary contract |
|---|---|---|
| Open contextual Library | Playwright browser acceptance | Library role/name and visible contextual tool |
| Place a component | Playwright browser acceptance | `.react-flow__node` / graph state |
| Keep placed component outside Library | Playwright browser acceptance | canvas geometry relative to contextual overlay |
| Select a component | Playwright browser acceptance | React Flow node selection / inspector visibility |
| Open object-local Inspector | Playwright browser acceptance | `object-local-inspector` |
| Edit instance property | Playwright browser acceptance | Inspector input + canonical `__WORLDS_DEBUG__` graph state |
| Connect component ports | Playwright browser acceptance | port/handle interaction + resulting edge |
| Open contextual Instruments | Playwright browser acceptance | instruments surface visibility |
| Configure simulation | Playwright browser acceptance | `simulation-setup` |
| Start/stop/step simulation | Playwright browser acceptance | `simulate-button` and simulation controls |
| Electrical example circuit | Playwright browser acceptance | component graph, connections, and expected instrument state |
| Diagnose browser failure | CI artifact inspection | Playwright report, screenshot, trace, results, acceptance log |

## Test-writing rules

- Prefer semantic roles, accessible names, and stable `data-testid` values.
- Use `.react-flow__node` for graph-node existence when the node identity is the behavior under test.
- When testing property edits, verify the canonical graph state rather than only the input field.
- Scope controls to their contextual surface when duplicate controls can exist elsewhere in the page.
- Use deterministic placement coordinates that account for contextual overlays.
- Do not restore assumptions from the old permanent-dashboard UI merely to make a test easier.

## Maintenance

When a user-visible contract changes intentionally, update the relevant test and this matrix in the same change. If only an implementation detail changes and the user-visible contract remains stable, prefer preserving the existing acceptance test.
