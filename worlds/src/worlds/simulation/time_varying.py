from __future__ import annotations

from dataclasses import dataclass
from math import isfinite, pi, sin
from typing import Mapping


class TimeVaryingSourceError(ValueError):
    """Raised when a time-varying source definition is invalid."""


@dataclass(frozen=True)
class TimeVaryingSource:
    """Validated waveform definition for an independent source."""

    waveform: str
    amplitude: float
    offset: float = 0.0
    frequency: float = 0.0
    phase: float = 0.0
    delay: float = 0.0

    def __post_init__(self) -> None:
        if self.waveform not in {"dc", "sine", "square"}:
            raise TimeVaryingSourceError(
                "source waveform must be one of: dc, sine, square"
            )
        for name, value in (
            ("amplitude", self.amplitude),
            ("offset", self.offset),
            ("frequency", self.frequency),
            ("phase", self.phase),
            ("delay", self.delay),
        ):
            try:
                parsed = float(value)
            except (TypeError, ValueError):
                raise TimeVaryingSourceError(
                    f"source {name} must be a finite number"
                ) from None
            if not isfinite(parsed):
                raise TimeVaryingSourceError(
                    f"source {name} must be a finite number"
                )
            object.__setattr__(self, name, parsed)
        if self.frequency < 0:
            raise TimeVaryingSourceError("source frequency must not be negative")
        if self.delay < 0:
            raise TimeVaryingSourceError("source delay must not be negative")
        if self.waveform != "dc" and self.frequency <= 0:
            raise TimeVaryingSourceError(
                "source frequency must be greater than zero for periodic waveforms"
            )

    @classmethod
    def from_dict(cls, value: Mapping[str, object]) -> "TimeVaryingSource":
        if not isinstance(value, Mapping):
            raise TimeVaryingSourceError("source waveform definition must be an object")
        waveform = value.get("waveform")
        if not isinstance(waveform, str) or not waveform:
            raise TimeVaryingSourceError("source waveform must be a non-empty string")
        return cls(
            waveform=waveform.lower(),
            amplitude=value.get("amplitude", 0.0),
            offset=value.get("offset", 0.0),
            frequency=value.get("frequency", 0.0),
            phase=value.get("phase", 0.0),
            delay=value.get("delay", 0.0),
        )

    def value_at(self, time: float) -> float:
        try:
            time = float(time)
        except (TypeError, ValueError):
            raise TimeVaryingSourceError("source evaluation time must be finite") from None
        if not isfinite(time):
            raise TimeVaryingSourceError("source evaluation time must be finite")
        if self.waveform == "dc":
            return self.offset + self.amplitude
        if time < self.delay:
            return self.offset
        angle = 2.0 * pi * self.frequency * (time - self.delay) + self.phase
        if self.waveform == "sine":
            return self.offset + self.amplitude * sin(angle)
        return self.offset + self.amplitude * (1.0 if sin(angle) >= 0.0 else -1.0)


def evaluate_time_varying_source(value: object, time: float) -> float | None:
    """Evaluate a waveform mapping, or return None for an ordinary scalar value."""
    if not isinstance(value, Mapping):
        return None
    return TimeVaryingSource.from_dict(value).value_at(time)
