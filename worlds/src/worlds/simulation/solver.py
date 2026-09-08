from __future__ import annotations

from dataclasses import dataclass, field

from worlds.math import Binary, FunctionCall, Number, Variable


class SolverError(Exception):
    pass


@dataclass(frozen=True)
class BranchCurrent(FunctionCall):
    """Internal branch-current unknown carrying its owning component."""
    component: str


@dataclass(frozen=True)
class SolveResult:
    values: dict[object, float]


class LinearSolver:
    def solve(self, equations, known: dict[object, float]) -> SolveResult:
        unknowns = self._collect_unknowns(equations, known)
        if not unknowns:
            return SolveResult({})
        matrix, rhs = [], []
        for equation in equations:
            coefficients, constant = self._linearize(equation, unknowns, known)
            matrix.append(coefficients)
            rhs.append(-constant)
        return SolveResult(self._gaussian_elimination(matrix, rhs, unknowns))

    def _collect_unknowns(self, equations, known):
        unknowns = []
        for equation in equations:
            self._collect_expression_unknowns(equation, known, unknowns)
        return unknowns

    def _collect_expression_unknowns(self, expression, known, unknowns):
        if isinstance(expression, Variable):
            if expression not in known and expression not in unknowns:
                unknowns.append(expression)
            return
        if isinstance(expression, FunctionCall):
            if expression not in known and expression not in unknowns:
                unknowns.append(expression)
            return
        if isinstance(expression, Number):
            return
        if isinstance(expression, Binary):
            self._collect_expression_unknowns(expression.left, known, unknowns)
            self._collect_expression_unknowns(expression.right, known, unknowns)
            return
        raise SolverError(f"Unsupported expression: {expression!r}")

    def _linearize(self, expression, unknowns, known):
        if isinstance(expression, Number):
            return [0.0] * len(unknowns), expression.value
        if isinstance(expression, Variable):
            if expression in known:
                return [0.0] * len(unknowns), known[expression]
            coefficients = [0.0] * len(unknowns)
            coefficients[unknowns.index(expression)] = 1.0
            return coefficients, 0.0
        if isinstance(expression, FunctionCall):
            if expression in known:
                return [0.0] * len(unknowns), known[expression]
            coefficients = [0.0] * len(unknowns)
            coefficients[unknowns.index(expression)] = 1.0
            return coefficients, 0.0
        if isinstance(expression, Binary):
            lc, lv = self._linearize(expression.left, unknowns, known)
            rc, rv = self._linearize(expression.right, unknowns, known)
            if expression.operator == "+":
                return [a + b for a, b in zip(lc, rc)], lv + rv
            if expression.operator == "-":
                return [a - b for a, b in zip(lc, rc)], lv - rv
            if expression.operator == "*":
                lu, ru = lc != [0.0] * len(unknowns), rc != [0.0] * len(unknowns)
                if lu and ru:
                    raise SolverError("Nonlinear multiplication")
                if lu:
                    return [x * rv for x in lc], lv * rv
                return [x * lv for x in rc], rv * lv
            if expression.operator == "/":
                if rc != [0.0] * len(unknowns):
                    raise SolverError("Division by an unknown")
                if rv == 0:
                    raise SolverError("Division by zero")
                return [x / rv for x in lc], lv / rv
        raise SolverError(f"Unsupported linear expression: {expression!r}")

    def _gaussian_elimination(self, matrix, rhs, unknowns):
        n = len(unknowns)
        if len(matrix) != n:
            raise SolverError(f"Expected {n} equations, got {len(matrix)}")
        a = [list(row) + [value] for row, value in zip(matrix, rhs)]
        for column in range(n):
            pivot = next((row for row in range(column, n) if abs(a[row][column]) > 1e-12), None)
            if pivot is None:
                raise SolverError("Singular or underdetermined equation system")
            a[column], a[pivot] = a[pivot], a[column]
            pivot_value = a[column][column]
            for index in range(column, n + 1):
                a[column][index] /= pivot_value
            for row in range(n):
                if row == column:
                    continue
                factor = a[row][column]
                for index in range(column, n + 1):
                    a[row][index] -= factor * a[column][index]
        return {unknown: a[index][n] for index, unknown in enumerate(unknowns)}


@dataclass(frozen=True)
class SimulationInstanceResult:
    name: str
    component: object
    result: "SimulationResult"

    def voltage(self) -> float:
        ports = self.component.ports
        if "p" not in ports or "n" not in ports:
            raise SolverError(f"Instance {self.name!r} does not have p/n ports")
        return self.result.node_voltage(ports["p"]) - self.result.node_voltage(ports["n"])

    def current(self) -> float:
        ports = self.component.ports
        if "p" not in ports or "n" not in ports:
            raise SolverError(f"Instance {self.name!r} does not have p/n ports")
        return self.result.component_current(self.name, ports["p"], ports["n"])

    def power(self) -> float:
        return self.voltage() * self.current()


@dataclass(frozen=True)
class SimulationResult:
    values: dict[object, float]
    instances: dict[str, object] = field(default_factory=dict)

    def value(self, unknown):
        try:
            return self.values[unknown]
        except KeyError:
            raise SolverError(f"No value available for: {unknown!r}")

    def instance(self, name: str) -> SimulationInstanceResult:
        try:
            component = self.instances[name]
        except KeyError:
            raise SolverError(f"No simulation instance available: {name!r}")
        return SimulationInstanceResult(name=name, component=component, result=self)

    def node_voltage(self, node: str) -> float:
        if node == "ground":
            return 0.0
        try:
            return self.values[Variable(f"V_{node}")]
        except KeyError:
            raise SolverError(f"No voltage available for node: {node!r}")

    def component_current(self, component: str, first_node: str, second_node: str) -> float:
        matches = []
        for unknown, value in self.values.items():
            if not isinstance(unknown, BranchCurrent) or unknown.component != component:
                continue
            if len(unknown.arguments) != 2:
                continue
            first, second = unknown.arguments
            if getattr(first, "name", None) == first_node and getattr(second, "name", None) == second_node:
                matches.append(value)
        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            raise SolverError(f"Multiple currents available for component: {component!r}")
        raise SolverError(f"No current available for component: {component!r}")

    @property
    def branch_currents(self) -> dict[tuple[str, str], float]:
        result = {}
        for unknown, value in self.values.items():
            if not isinstance(unknown, FunctionCall) or unknown.name != "current" or len(unknown.arguments) != 2:
                continue
            first, second = unknown.arguments
            first_name, second_name = getattr(first, "name", None), getattr(second, "name", None)
            if first_name is not None and second_name is not None:
                result[(first_name, second_name)] = value
        return result

    @property
    def node_voltages(self) -> dict[str, float]:
        result = {"ground": 0.0}
        for unknown, value in self.values.items():
            if isinstance(unknown, Variable) and unknown.name.startswith("V_"):
                result[unknown.name[2:]] = value
        return result

    def branch_current(self, first_node: str, second_node: str) -> float:
        matches = []
        for unknown, value in self.values.items():
            if not isinstance(unknown, FunctionCall) or unknown.name != "current" or len(unknown.arguments) != 2:
                continue
            first, second = unknown.arguments
            if getattr(first, "name", None) == first_node and getattr(second, "name", None) == second_node:
                matches.append(value)
        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            raise SolverError(f"Multiple currents available for branch: {first_node!r} -> {second_node!r}")
        raise SolverError(f"No current available for branch: {first_node!r} -> {second_node!r}")


class SimulationSolver:
    def __init__(self):
        self.linear_solver = LinearSolver()

    def solve(self, equation_system, known: dict[object, float] | None = None) -> SimulationResult:
        known = known or {}
        expressions = [equation.expression for equation in equation_system.equations]
        result = self.linear_solver.solve(expressions, known)
        return SimulationResult(values=result.values)
