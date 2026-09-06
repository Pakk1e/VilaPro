from __future__ import annotations

import math
from dataclasses import dataclass

from .model import SimulationModel


class SimulationValidationError(Exception):
    pass


@dataclass(frozen=True)
class ValidationIssue:
    code: str
    message: str


class SimulationValidator:
    """Validate a simulation model before equation generation and solving."""

    def validate(self, model: SimulationModel) -> None:
        issues: list[ValidationIssue] = []

        if not model.components:
            issues.append(ValidationIssue("NO_COMPONENTS", "Simulation contains no components."))

        if "ground" not in model.nodes:
            issues.append(ValidationIssue("NO_GROUND", "Simulation has no ground node."))

        for index, component in enumerate(model.components):
            prefix = component.display_name or f"Component #{index + 1}"

            if not component.ports:
                issues.append(ValidationIssue("NO_PORTS", f"Component '{prefix}' has no ports."))

            for port, node in component.ports.items():
                if not node:
                    issues.append(
                        ValidationIssue(
                            "EMPTY_NODE",
                            f"Component '{prefix}' terminal '{port}' is unconnected.",
                        )
                    )

            for parameter, value in component.parameters.items():
                if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value):
                    issues.append(
                        ValidationIssue(
                            "INVALID_PARAMETER",
                            f"Component '{prefix}' parameter '{parameter}' must be a finite number.",
                        )
                    )
                elif value <= 0:
                    issues.append(
                        ValidationIssue(
                            "INVALID_PARAMETER",
                            f"Component '{prefix}' parameter '{parameter}' must be greater than zero.",
                        )
                    )

        if issues:
            message = "\n".join(
                f"[{issue.code}] {issue.message}" for issue in issues
            )
            raise SimulationValidationError(message)
