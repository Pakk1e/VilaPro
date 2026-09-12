# Electrical UI rework

This directory is being migrated incrementally toward the schematic-first Electrical workspace defined in `docs/UI_REWORK.md`.

The migration keeps the existing World Graph, editor model, serializer, simulation engine, runtime transport, and result model as separate boundaries. New presentation components should consume those boundaries rather than becoming owners of physical state.
