from __future__ import annotations

from dataclasses import dataclass, field
from threading import RLock
from typing import Mapping

from worlds.semantics import WorldSemanticAnalyzer
from worlds.semantics.component import ComponentSemanticAnalyzer
from worlds.vdl import Parser

from .analysis import SimulationConfiguration
from .builder import build_simulation_component
from .live import LiveSimulationSnapshot
from .live_runtime import LiveSimulationRuntime, LiveSimulationRuntimeError
from .live_service import LiveSimulationManager, LiveSimulationServiceError
from .mode import SimulationMode
from .model import SimulationModel
from .validation import SimulationValidator


class LiveSimulationApplicationError(RuntimeError):
    """Raised when the live simulation application boundary cannot proceed."""


@dataclass(frozen=True)
class _LiveContext:
    configuration: SimulationConfiguration
    model: SimulationModel
    known: Mapping[object, float]


@dataclass
class LiveSimulationApplicationService:
    """Application service owning live simulation execution context."""

    manager: LiveSimulationManager
    runtime: LiveSimulationRuntime | None = None
    _contexts: dict[str, _LiveContext] = field(default_factory=dict)
    _lock: RLock = field(default_factory=RLock, repr=False)

    def __post_init__(self) -> None:
        if self.runtime is None:
            self.runtime = LiveSimulationRuntime(self.manager)

    def start(
        self,
        world_source: str,
        instances: list[dict],
        *,
        known: Mapping[object, float] | None = None,
        simulation: dict | None = None,
    ) -> LiveSimulationSnapshot:
        configuration = SimulationConfiguration.from_dict(simulation)
        if configuration.mode is not SimulationMode.LIVE:
            raise LiveSimulationApplicationError("live application service requires simulation.mode='live'")
        model = self._build_model(world_source, instances)
        try:
            snapshot = self.runtime.start(configuration)
        except LiveSimulationRuntimeError as exc:
            raise LiveSimulationApplicationError(str(exc)) from exc
        with self._lock:
            self._contexts[snapshot.session_id] = _LiveContext(
                configuration=configuration,
                model=model,
                known=dict(known or {}),
            )
        return snapshot

    def get(self, session_id: str) -> LiveSimulationSnapshot:
        try:
            return self.manager.get(session_id)
        except LiveSimulationServiceError as exc:
            raise LiveSimulationApplicationError(str(exc)) from exc

    def step(self, session_id: str) -> LiveSimulationSnapshot:
        context = self._get_context(session_id)
        try:
            return self.runtime.step(
                session_id,
                context.model,
                known=context.known,
                configuration=context.configuration,
            )
        except LiveSimulationRuntimeError as exc:
            raise LiveSimulationApplicationError(str(exc)) from exc

    def cancel(self, session_id: str) -> LiveSimulationSnapshot:
        try:
            snapshot = self.runtime.cancel(session_id)
        except LiveSimulationRuntimeError as exc:
            raise LiveSimulationApplicationError(str(exc)) from exc
        self._drop_context(session_id)
        return snapshot

    def complete(self, session_id: str) -> LiveSimulationSnapshot:
        try:
            snapshot = self.runtime.complete(session_id)
        except LiveSimulationRuntimeError as exc:
            raise LiveSimulationApplicationError(str(exc)) from exc
        self._drop_context(session_id)
        return snapshot

    def _get_context(self, session_id: str) -> _LiveContext:
        with self._lock:
            context = self._contexts.get(session_id)
        if context is None:
            raise LiveSimulationApplicationError(f"Unknown live simulation session: {session_id}")
        return context

    def _drop_context(self, session_id: str) -> None:
        with self._lock:
            self._contexts.pop(session_id, None)

    @staticmethod
    def _build_model(world_source: str, instances: list[dict]) -> SimulationModel:
        try:
            world = Parser(world_source).parse()
            semantic = WorldSemanticAnalyzer(world).analyze()
            model = SimulationModel()
            type_counts: dict[str, int] = {}
            for index, instance in enumerate(instances):
                component_name = instance["type"]
                type_counts[component_name] = type_counts.get(component_name, 0) + 1
                component_id = str(instance.get("id") or f"component-{index + 1}")
                display_name = str(instance.get("name") or component_id)
                instance_name = f"{component_name}_{type_counts[component_name]}"
                component = semantic.component(component_name)
                analyzer = ComponentSemanticAnalyzer(
                    component.component,
                    semantic.types,
                    semantic.functions,
                )
                simulation_component = build_simulation_component(
                    analyzer,
                    name=instance_name,
                    display_name=display_name,
                    component_id=component_id,
                    parameters=instance.get("parameters", {}),
                    ports=instance.get("ports", {}),
                )
                model.add_component(simulation_component)
            SimulationValidator().validate(model)
            return model
        except Exception as exc:
            raise LiveSimulationApplicationError(str(exc)) from exc


_DEFAULT_APPLICATION_SERVICE = LiveSimulationApplicationService(
    LiveSimulationManager()
)


def get_live_simulation_application_service() -> LiveSimulationApplicationService:
    return _DEFAULT_APPLICATION_SERVICE
