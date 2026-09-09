from __future__ import annotations

from collections.abc import Iterable

from .series import SimulationSeries


class SimulationSeriesSelectionError(ValueError):
    """Raised when a requested series selection is invalid."""


def select_series(series: Iterable[SimulationSeries], requested_ids: Iterable[str] | None = None) -> tuple[SimulationSeries, ...]:
    """Return series in requested order, or all series when no selection is supplied."""
    available = tuple(series)
    if requested_ids is None:
        return available
    requested = tuple(requested_ids)
    index = {item.id: item for item in available}
    missing = tuple(item for item in requested if item not in index)
    if missing:
        raise SimulationSeriesSelectionError(f"Unknown simulation series: {', '.join(missing)}")
    if len(requested) != len(set(requested)):
        raise SimulationSeriesSelectionError("requested series ids must be unique")
    return tuple(index[item] for item in requested)


def filter_series_by_quantity(series: Iterable[SimulationSeries], quantity: str) -> tuple[SimulationSeries, ...]:
    """Return all series representing the requested physical quantity."""
    if not quantity:
        raise SimulationSeriesSelectionError("quantity must not be empty")
    return tuple(item for item in series if item.quantity == quantity)
