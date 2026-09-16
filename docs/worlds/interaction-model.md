# Worlds Interaction Model

## Core principle

Worlds is a visual system-modeling workspace. The schematic canvas is the primary workspace; tools appear contextually around it rather than forming a permanent multi-panel dashboard.

## Contextual surfaces

### Component Library

The Library is a contextual component tool. It can be opened when the user wants to place a component and closed after placement. Placed components must remain visible on the schematic and must not be hidden behind the Library overlay.

### Object-local Inspector

Selecting an object exposes its object-local inspection surface. The inspector describes the selected instance and provides editable instance properties where supported.

Property edits must cross the established Worlds state/graph update boundary. Local inspector state must not become a competing source of truth.

### Instruments and simulation

Instruments and simulation controls are contextual to the workspace. They should not permanently consume the main schematic area when they are not being used.

## Component placement

A placement interaction consists of:

1. open the contextual Library;
2. choose a component;
3. place it on the schematic canvas;
4. verify the resulting graph node exists;
5. close the contextual placement tool when appropriate.

Placement coordinates must account for contextual overlays so a new component is not placed underneath the Library.

## Selection and editing

Objects are selectable directly from the schematic. Selection should expose the object-local Inspector without requiring navigation away from the canvas.

Changing an instance property updates the canonical graph through the established event/state boundary. Consumers such as instruments must observe the canonical instance state rather than a duplicated local form state.

## Connections

Connections are made port-to-port through the schematic interaction. The graph connection is the source of truth; visual edge rendering is its representation.

## Testing implications

Acceptance tests should exercise these interactions through the same visible controls users operate. Stable semantic selectors and explicit graph-state assertions are preferred over brittle pixel-based assertions.
