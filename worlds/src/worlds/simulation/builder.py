from __future__ import annotations

from worlds.semantics.component import ComponentSemanticAnalyzer

from .model import SimulationComponent


class SimulationBuildError(Exception):
    pass


def build_simulation_component(
    analyzer: ComponentSemanticAnalyzer,
    *,
    name: str,
    parameters: dict[str, float],
    ports: dict[str, str],
    display_name: str | None = None,
    component_id: str | None = None,
) -> SimulationComponent:
    """Build a runtime simulation component from a validated definition."""

    component = analyzer.component

    expected_parameters = {parameter.name for parameter in component.parameters}
    expected_ports = {port.name for port in component.ports}

    if set(parameters) != expected_parameters:
        raise SimulationBuildError(
            "Parameter mismatch for "
            f"{component.name}: expected {sorted(expected_parameters)}, "
            f"got {sorted(parameters)}"
        )

    if set(ports) != expected_ports:
        raise SimulationBuildError(
            "Port mismatch for "
            f"{component.name}: expected {sorted(expected_ports)}, "
            f"got {sorted(ports)}"
        )

    equations = []
    for representation in component.representations:
        equations.extend(representation.equations)

    return SimulationComponent(
        name=name,
        display_name=display_name or name,
        component_id=component_id or name,
        component_type=component.name,
        parameters=dict(parameters),
        ports=dict(ports),
        equations=equations,
    )
