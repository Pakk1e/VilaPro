from __future__ import annotations

from dataclasses import dataclass

from .model import SimulationModel


class SimulationValidationError(Exception):
    pass


@dataclass(frozen=True)
class ValidationIssue:
    code: str
    message: str


class SimulationValidator:
    """
    Validate a simulation model before equation generation
    and solving.
    """

    def validate(self, model: SimulationModel) -> None:
        issues: list[ValidationIssue] = []

        if not model.components:
            issues.append(
                ValidationIssue(
                    "NO_COMPONENTS",
                    "Simulation contains no components.",
                )
            )

        if "ground" not in model.nodes:
            issues.append(
                ValidationIssue(
                    "NO_GROUND",
                    "Simulation has no ground node.",
                )
            )

        for index, component in enumerate(model.components):
            prefix = (
                f"Component '{component.name}'"
                if component.name
                else f"Component #{index + 1}"
            )

            if not component.ports:
                issues.append(
                    ValidationIssue(
                        "NO_PORTS",
                        f"{prefix} has no ports.",
                    )
                )

            for port, node in component.ports.items():
                if not node:
                    issues.append(
                        ValidationIssue(
                            "EMPTY_NODE",
                            f"{prefix} port '{port}' "
                            "is connected to an empty node.",
                        )
                    )

            for parameter, value in component.parameters.items():
                if not isinstance(value, (int, float)):
                    issues.append(
                        ValidationIssue(
                            "INVALID_PARAMETER",
                            f"{prefix} parameter '{parameter}' "
                            f"must be numeric.",
                        )
                    )

        if issues:
            message = "\n".join(
                f"[{issue.code}] {issue.message}"
                for issue in issues
            )

            raise SimulationValidationError(message)
