from __future__ import annotations

from collections.abc import Mapping

from .result import SimulationResultModel
from .series import SimulationSeries, SimulationSeriesError


class SimulationSeriesFactory:
    """Convert generic simulation result datasets into plottable series."""

    _QUANTITY_METADATA = {
        "node_voltages": ("voltage", "V", "node"),
        "branch_currents": ("current", "A", "branch"),
    }

    def from_result(self, result: SimulationResultModel) -> tuple[SimulationSeries, ...]:
        analysis = str(result.analysis_information.get("analysis", "simulation"))
        axis_name = self._axis_name(result)
        axis = self._axis_values(result, axis_name)
        series: list[SimulationSeries] = []
        for dataset in result.datasets:
            metadata = self._QUANTITY_METADATA.get(dataset.name)
            if metadata is not None:
                series.extend(self._from_measurement_dataset(result, dataset, metadata, axis_name, axis, analysis))
            elif dataset.name == "components":
                series.extend(self._from_component_dataset(dataset, axis_name, axis))
        return tuple(series)

    def _from_measurement_dataset(self, result, dataset, metadata, axis_name, axis, analysis):
        quantity, unit, source_kind = metadata
        if not isinstance(dataset.values, (list, tuple)):
            return ()
        keys = self._keys(dataset.values)
        result_series = []
        for key in keys:
            y = result.series(dataset.name, key)
            if len(y) != len(axis):
                raise SimulationSeriesError(f"Dataset '{dataset.name}' is not aligned with axis '{axis_name}'")
            result_series.append(SimulationSeries.from_values(id=f"{dataset.name}:{key}", label=f"{'V' if quantity == 'voltage' else 'I'}({key})", x=axis, y=tuple(self._numeric_or_none(value) for value in y), quantity=quantity, unit=unit, source=f"{source_kind}:{key}"))
        return tuple(result_series)

    def _from_component_dataset(self, dataset, axis_name, axis):
        rows = dataset.values
        if not isinstance(rows, (list, tuple)):
            return ()
        if len(rows) != len(axis):
            raise SimulationSeriesError(f"Dataset 'components' is not aligned with axis '{axis_name}'")
        keys = self._component_keys(rows)
        result_series = []
        for key in keys:
            component_name = self._component_name(rows, key) or key
            for field, quantity, unit, prefix in (("voltage", "voltage", "V", "V"), ("current", "current", "A", "I"), ("power", "power", "W", "P")):
                values = tuple(self._component_value(row, key, field) for row in rows)
                if not any(value is not None for value in values):
                    continue
                result_series.append(SimulationSeries.from_values(id=f"components:{key}:{field}", label=f"{prefix}({component_name})", x=axis, y=values, quantity=quantity, unit=unit, source=f"component:{key}"))
        return tuple(result_series)

    @staticmethod
    def _component_keys(rows):
        keys: set[str] = set()
        for row in rows:
            if row is None:
                continue
            if not isinstance(row, (list, tuple)):
                # Component datasets are optional and historically allowed arbitrary
                # shapes. Ignore unsupported rows rather than turning them into a
                # hard failure for otherwise valid node/branch result series.
                continue
            for component in row:
                if not isinstance(component, Mapping):
                    continue
                key = component.get("id")
                if key is not None:
                    keys.add(str(key))
        return tuple(sorted(keys))

    @staticmethod
    def _component_name(rows, key):
        for row in rows:
            if not isinstance(row, (list, tuple)):
                continue
            for component in row:
                if isinstance(component, Mapping) and str(component.get("id")) == key:
                    return str(component.get("name") or key)
        return None

    @staticmethod
    def _component_value(row, key, field):
        if not isinstance(row, (list, tuple)):
            return None
        for component in row:
            if isinstance(component, Mapping) and str(component.get("id")) == key:
                return SimulationSeriesFactory._numeric_or_none(component.get(field))
        return None

    @staticmethod
    def _axis_name(result: SimulationResultModel) -> str:
        analysis = result.analysis_information.get("analysis")
        if analysis == "transient": return "time"
        if analysis == "dc_sweep": return "sweep"
        if result.datasets and result.datasets[0].name in {"time", "sweep"}: return result.datasets[0].name
        raise SimulationSeriesError("Result does not expose a supported independent-variable dataset")

    @staticmethod
    def _axis_values(result: SimulationResultModel, axis_name: str) -> tuple[float, ...]:
        values = result.dataset(axis_name).values
        if not isinstance(values, (list, tuple)):
            raise SimulationSeriesError(f"Axis dataset '{axis_name}' must contain a sequence")
        try: return tuple(float(value) for value in values)
        except (TypeError, ValueError): raise SimulationSeriesError(f"Axis dataset '{axis_name}' contains a non-numeric value") from None

    @staticmethod
    def _keys(rows: list[object] | tuple[object, ...]) -> tuple[str, ...]:
        keys: set[str] = set()
        for row in rows:
            if isinstance(row, Mapping): keys.update(str(key) for key in row)
            elif row is not None: raise SimulationSeriesError("Series dataset contains a non-mapping row")
        return tuple(sorted(keys))

    @staticmethod
    def _numeric_or_none(value: object | None) -> float | None:
        if value is None: return None
        try: return float(value)
        except (TypeError, ValueError): raise SimulationSeriesError("Series dataset contains a non-numeric value") from None


def result_to_series(result: SimulationResultModel) -> tuple[SimulationSeries, ...]:
    """Convenience wrapper for converting a result into plottable series."""
    return SimulationSeriesFactory().from_result(result)
