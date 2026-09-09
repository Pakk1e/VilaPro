from __future__ import annotations

from typing import Any

from .service import SimulationResponse


def response_to_api_payload(response: SimulationResponse) -> dict[str, Any]:
    """Build the stable public JSON contract for a completed simulation."""
    return {
        "ok": True,
        "analysis": response.analysis,
        "status": response.status,
        "node_voltages": dict(response.node_voltages),
        "branch_currents": dict(response.branch_currents),
        "components": list(response.components),
        "result": response.result.to_dict(),
        "visualization": response.plot(),
    }
