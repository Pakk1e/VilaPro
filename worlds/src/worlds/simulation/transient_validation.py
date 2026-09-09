from __future__ import annotations

import math
from collections.abc import Iterable


def rc_voltage(
    time: float,
    resistance: float,
    capacitance: float,
    source_voltage: float,
    initial_voltage: float = 0.0,
) -> float:
    """Analytical capacitor voltage for a first-order RC network."""
    _require_positive(resistance, "resistance")
    _require_positive(capacitance, "capacitance")
    tau = resistance * capacitance
    return source_voltage + (initial_voltage - source_voltage) * math.exp(-time / tau)


def rl_current(
    time: float,
    resistance: float,
    inductance: float,
    source_voltage: float,
    initial_current: float = 0.0,
) -> float:
    """Analytical inductor current for a first-order RL network."""
    _require_positive(resistance, "resistance")
    _require_positive(inductance, "inductance")
    steady_state = source_voltage / resistance
    tau = inductance / resistance
    return steady_state + (initial_current - steady_state) * math.exp(-time / tau)


def max_absolute_error(actual: Iterable[float], expected: Iterable[float]) -> float:
    """Return the maximum pointwise absolute error between two sequences."""
    actual_values = tuple(float(value) for value in actual)
    expected_values = tuple(float(value) for value in expected)
    if len(actual_values) != len(expected_values):
        raise ValueError("actual and expected sequences must have equal length")
    if not actual_values:
        return 0.0
    return max(abs(a - e) for a, e in zip(actual_values, expected_values))


def relative_error(actual: float, expected: float, *, floor: float = 1e-15) -> float:
    """Return absolute error normalized by the expected magnitude."""
    denominator = max(abs(float(expected)), floor)
    return abs(float(actual) - float(expected)) / denominator


def _require_positive(value: float, name: str) -> None:
    value = float(value)
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f"{name} must be a finite number greater than zero")
