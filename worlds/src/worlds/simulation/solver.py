from __future__ import annotations

from dataclasses import dataclass, field

from worlds.math import Binary, FunctionCall, Number, Variable


class SolverError(Exception):
    pass


@dataclass(frozen=True)
class BranchCurrent(FunctionCall):
    """
    Internal branch-current unknown.

    It intentionally keeps the public FunctionCall shape:
        current(node_a, node_b)

    while carrying the owning component name so two components
    connected between the same pair of nodes still have distinct
    solver unknowns.
    """

    component: str


@dataclass(frozen=True)
class SolveResult:
    values: dict[object, float]


class LinearSolver:
    """
    Minimal linear solver for simulation equations.

    Initially supports equations containing:
        - variables
        - numeric constants
        - +, -, *, /
        - known values

    Physical functions are treated as unknown quantities.
    """

    def solve(
        self,
        equations,
        known: dict[object, float],
    ) -> SolveResult:

        unknowns = self._collect_unknowns(
            equations,
            known,
        )

        if not unknowns:
            return SolveResult({})

        matrix = []
        rhs = []

        for equation in equations:
            coefficients, constant = self._linearize(
                equation,
                unknowns,
                known,
            )

            matrix.append(coefficients)
            rhs.append(-constant)

        values = self._gaussian_elimination(
            matrix,
            rhs,
            unknowns,
        )

        return SolveResult(values)

    def _collect_unknowns(self, equations, known):
        unknowns = []

        for equation in equations:
            self._collect_expression_unknowns(
                equation,
                known,
                unknowns,
            )

        return unknowns

    def _collect_expression_unknowns(
        self,
        expression,
        known,
        unknowns,
    ):
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
            self._collect_expression_unknowns(
                expression.left,
                known,
                unknowns,
            )
            self._collect_expression_unknowns(
                expression.right,
                known,
                unknowns,
            )
            return

        raise SolverError(
            f"Unsupported expression: {expression!r}"
        )

    def _linearize(
        self,
        expression,
        unknowns,
        known,
    ):
        """
        Return:

            coefficients, constant

        representing:

            coefficients * unknowns + constant
        """

        if isinstance(expression, Number):
            return (
                [0.0] * len(unknowns),
                expression.value,
            )

        if isinstance(expression, Variable):
            if expression in known:
                return (
                    [0.0] * len(unknowns),
                    known[expression],
                )

            coefficients = [0.0] * len(unknowns)
            coefficients[unknowns.index(expression)] = 1.0

            return coefficients, 0.0

        if isinstance(expression, FunctionCall):
            if expression in known:
                return (
                    [0.0] * len(unknowns),
                    known[expression],
                )

            coefficients = [0.0] * len(unknowns)
            coefficients[unknowns.index(expression)] = 1.0

            return coefficients, 0.0

        if isinstance(expression, Binary):
            left_coefficients, left_constant = self._linearize(
                expression.left,
                unknowns,
                known,
            )

            right_coefficients, right_constant = self._linearize(
                expression.right,
                unknowns,
                known,
            )

            if expression.operator == "+":
                return (
                    [
                        a + b
                        for a, b in zip(
                            left_coefficients,
                            right_coefficients,
                        )
                    ],
                    left_constant + right_constant,
                )

            if expression.operator == "-":
                return (
                    [
                        a - b
                        for a, b in zip(
                            left_coefficients,
                            right_coefficients,
                        )
                    ],
                    left_constant - right_constant,
                )

            if expression.operator == "*":
                if left_coefficients != [0.0] * len(unknowns):
                    if right_coefficients != [0.0] * len(unknowns):
                        raise SolverError(
                            "Nonlinear multiplication"
                        )

                    factor = right_constant

                    return (
                        [
                            value * factor
                            for value in left_coefficients
                        ],
                        left_constant * factor,
                    )

                factor = left_constant

                return (
                    [
                        value * factor
                        for value in right_coefficients
                    ],
                    right_constant * factor,
                )

            if expression.operator == "/":
                if right_coefficients != [0.0] * len(unknowns):
                    raise SolverError(
                        "Division by an unknown"
                    )

                if right_constant == 0:
                    raise SolverError(
                        "Division by zero"
                    )

                return (
                    [
                        value / right_constant
                        for value in left_coefficients
                    ],
                    left_constant / right_constant,
                )

        raise SolverError(
            f"Unsupported linear expression: {expression!r}"
        )

    def _gaussian_elimination(
        self,
        matrix,
        rhs,
        unknowns,
    ):
        n = len(unknowns)

        if len(matrix) != n:
            raise SolverError(
                f"Expected {n} equations, got {len(matrix)}"
            )

        a = [
            list(row) + [value]
            for row, value in zip(matrix, rhs)
        ]

        for column in range(n):
            pivot = None

            for row in range(column, n):
                if abs(a[row][column]) > 1e-12:
                    pivot = row
                    break

            if pivot is None:
                raise SolverError(
                    "Singular or underdetermined equation system"
                )

            a[column], a[pivot] = (
                a[pivot],
                a[column],
            )

            pivot_value = a[column][column]

            for index in range(column, n + 1):
                a[column][index] /= pivot_value

            for row in range(n):
                if row == column:
                    continue

                factor = a[row][column]

                for index in range(column, n + 1):
                    a[row][index] -= (
                        factor * a[column][index]
                    )

        return {
            unknown: a[index][n]
            for index, unknown in enumerate(unknowns)
        }


@dataclass(frozen=True)
class SimulationInstanceResult:
    """
    Solved electrical values for one named circuit instance.
    """

    name: str
    component: object
    result: "SimulationResult"

    def voltage(self) -> float:
        ports = self.component.ports

        if "p" not in ports or "n" not in ports:
            raise SolverError(
                f"Instance {self.name!r} does not have "
                "p/n ports"
            )

        return (
            self.result.node_voltage(ports["p"])
            - self.result.node_voltage(ports["n"])
        )

    def current(self) -> float:
        ports = self.component.ports

        if "p" not in ports or "n" not in ports:
            raise SolverError(
                f"Instance {self.name!r} does not have "
                "p/n ports"
            )

        return self.result.branch_current(
            ports["p"],
            ports["n"],
        )

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
            raise SolverError(
                f"No value available for: {unknown!r}"
            )

    def instance(self, name: str) -> SimulationInstanceResult:
        try:
            component = self.instances[name]
        except KeyError:
            raise SolverError(
                f"No simulation instance available: {name!r}"
            )

        return SimulationInstanceResult(
            name=name,
            component=component,
            result=self,
        )

    def node_voltage(self, node: str) -> float:
        """
        Return the solved voltage of a simulation node.

        Ground is always defined as 0 V.
        """

        if node == "ground":
            return 0.0

        unknown = Variable(f"V_{node}")

        try:
            return self.values[unknown]
        except KeyError:
            raise SolverError(
                f"No voltage available for node: {node!r}"
            )

    @property
    def branch_currents(self) -> dict[tuple[str, str], float]:
        """
        Return all solved branch currents.

        Currents are keyed by:
            (first_node, second_node)

        The sign follows the direction from first_node
        to second_node.
        """

        result = {}

        for unknown, value in self.values.items():
            if (
                isinstance(unknown, FunctionCall)
                and unknown.name == "current"
                and len(unknown.arguments) == 2
            ):
                first, second = unknown.arguments

                first_name = getattr(
                    first,
                    "name",
                    None,
                )
                second_name = getattr(
                    second,
                    "name",
                    None,
                )

                if (
                    first_name is not None
                    and second_name is not None
                ):
                    result[
                        (first_name, second_name)
                    ] = value

        return result

    @property
    def node_voltages(self) -> dict[str, float]:
        """
        Return all solved node voltages.

        Ground is included explicitly as 0 V.
        """

        result = {
            "ground": 0.0,
        }

        for unknown, value in self.values.items():
            if (
                isinstance(unknown, Variable)
                and unknown.name.startswith("V_")
            ):
                result[unknown.name[2:]] = value

        return result

    def branch_current(
        self,
        first_node: str,
        second_node: str,
    ) -> float:
        """
        Return current flowing from first_node to second_node.

        The network solver keeps component identity on the internal
        branch-current unknown. This method preserves the original
        node-pair API and resolves the unique matching branch.
        """

        matches = []

        for unknown, value in self.values.items():
            if not (
                isinstance(unknown, FunctionCall)
                and unknown.name == "current"
                and len(unknown.arguments) == 2
            ):
                continue

            first, second = unknown.arguments

            if (
                getattr(first, "name", None) == first_node
                and getattr(second, "name", None) == second_node
            ):
                matches.append(value)

        if len(matches) == 1:
            return matches[0]

        if len(matches) > 1:
            raise SolverError(
                "Multiple currents available for branch: "
                f"{first_node!r} -> {second_node!r}"
            )

        raise SolverError(
            "No current available for branch: "
            f"{first_node!r} -> {second_node!r}"
        )


class SimulationSolver:
    """
    High-level solver for a simulation EquationSystem.
    """

    def __init__(self):
        self.linear_solver = LinearSolver()

    def solve(
        self,
        equation_system,
        known: dict[object, float] | None = None,
    ) -> SimulationResult:

        known = known or {}

        expressions = [
            equation.expression
            for equation in equation_system.equations
        ]

        result = self.linear_solver.solve(
            expressions,
            known,
        )

        return SimulationResult(
            values=result.values,
        )