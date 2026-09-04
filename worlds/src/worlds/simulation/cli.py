from __future__ import annotations

import json
import sys

from .service import SimulationService, SimulationServiceError


def main() -> int:
    try:
        request = json.load(sys.stdin)

        world_source = request["world_source"]
        instances = request.get("instances", [])
        known = request.get("known")

        response = SimulationService().simulate(
            world_source=world_source,
            instances=instances,
            known=known,
        )

        output = {
            "ok": True,
            "node_voltages": response.node_voltages,
            "branch_currents": response.branch_currents,
        }

        json.dump(output, sys.stdout)
        sys.stdout.write("\n")

        return 0

    except (KeyError, TypeError, ValueError) as exc:
        json.dump(
            {
                "ok": False,
                "error": str(exc),
            },
            sys.stdout,
        )
        sys.stdout.write("\n")
        return 1

    except SimulationServiceError as exc:
        json.dump(
            {
                "ok": False,
                "error": str(exc),
            },
            sys.stdout,
        )
        sys.stdout.write("\n")
        return 1

    except Exception as exc:
        json.dump(
            {
                "ok": False,
                "error": str(exc),
            },
            sys.stdout,
        )
        sys.stdout.write("\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
