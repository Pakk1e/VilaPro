from __future__ import annotations

from typing import Any

from .live import LiveSimulationSnapshot
from .service import SimulationResponse


def response_to_api_payload(response: SimulationResponse) -> dict[str, Any]:
    """Build the stable public JSON contract for a completed simulation."""
    analysis = response.analysis
    visualization = response.plot() if analysis in {"dc_sweep", "transient"} else None
    return {
        "ok": True,
        "analysis": analysis,
        "status": response.status,
        "node_voltages": dict(response.node_voltages),
        "branch_currents": dict(response.branch_currents),
        "components": list(response.components),
        "result": response.result.to_dict(),
        "visualization": visualization,
    }


def live_snapshot_to_api_payload(snapshot: LiveSimulationSnapshot) -> dict[str, Any]:
    """Build the stable public JSON contract for a live session snapshot."""
    return {
        "ok": True,
        "session_id": snapshot.session_id,
        "analysis": snapshot.analysis,
        "mode": snapshot.mode.value,
        "status": snapshot.status,
        "independent_value": snapshot.independent_value,
        "signals": dict(snapshot.signals),
        "error": snapshot.error,
    }
