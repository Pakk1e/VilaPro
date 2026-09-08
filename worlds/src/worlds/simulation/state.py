from __future__ import annotations

from dataclasses import dataclass
from types import MappingProxyType
from typing import Any, Mapping


class DynamicStateError(ValueError):
    """Raised when transient dynamic state is invalid."""


@dataclass(frozen=True)
class TransientStepContext:
    """Context shared by devices while advancing one transient time step."""

    time: float
    previous_time: float | None
    dt: float | None

    def __post_init__(self) -> None:
        if self.previous_time is None:
            if self.dt is not None:
                raise DynamicStateError("initial transient step cannot have dt")
            return
        if self.dt is None or self.dt <= 0:
            raise DynamicStateError("transient step dt must be greater than zero")
        if self.time <= self.previous_time:
            raise DynamicStateError("transient time must advance forward")
        if abs((self.time - self.previous_time) - self.dt) > 1e-12:
            raise DynamicStateError("transient step dt does not match time interval")


@dataclass(frozen=True)
class DynamicStateSnapshot:
    """Immutable state accepted from the previous transient step."""

    values: Mapping[str, Any]

    def __post_init__(self) -> None:
        object.__setattr__(self, "values", MappingProxyType(dict(self.values)))

    def get(self, component_id: str, default: Any = None) -> Any:
        return self.values.get(component_id, default)

    def for_component(self, component_id: str) -> Any:
        return self.values.get(component_id)


class DynamicState:
    """Mutable builder for the next accepted transient state."""

    def __init__(self, initial: Mapping[str, Any] | None = None) -> None:
        self._values = dict(initial or {})

    def get(self, component_id: str, default: Any = None) -> Any:
        return self._values.get(component_id, default)

    def set(self, component_id: str, value: Any) -> None:
        if not isinstance(component_id, str) or not component_id:
            raise DynamicStateError("component_id must be a non-empty string")
        self._values[component_id] = value

    def snapshot(self) -> DynamicStateSnapshot:
        return DynamicStateSnapshot(self._values)

    def copy(self) -> "DynamicState":
        return DynamicState(self._values)
