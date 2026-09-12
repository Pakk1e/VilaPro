# Electrical UI rework

This directory is being migrated incrementally toward the schematic-first Electrical workspace defined in `docs/UI_REWORK.md` and refined by `docs/UI_REWORK_V2.md`.

## V2 presentation rule

The schematic is the primary workspace. Library, Inspector, simulation setup, and Instruments are contextual tools that appear when needed; they must not permanently compete with the circuit for screen space.

Prefer:

- canvas-first composition over dashboard grids;
- direct schematic interaction over form-heavy workflows;
- contextual overlays and docks over permanently visible empty panels;
- restrained engineering chrome and clear visual hierarchy;
- Build and Simulate as distinct workspace states;
- probe-driven measurement and instruments tied to actual simulation results.

Avoid introducing presentation logic that becomes a second source of World Graph truth. The existing World Graph, editor model, serializer, simulation engine, runtime transport, and result model remain separate boundaries. New presentation components should consume those boundaries rather than becoming owners of physical state.
