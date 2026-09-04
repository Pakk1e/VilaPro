from __future__ import annotations

from dataclasses import dataclass


class Expression:
    """Base class for all mathematical expressions."""


@dataclass(frozen=True)
class Number(Expression):
    value: float


@dataclass(frozen=True)
class Variable(Expression):
    name: str


@dataclass(frozen=True)
class Unary(Expression):
    operator: str
    operand: Expression


@dataclass(frozen=True)
class Binary(Expression):
    left: Expression
    operator: str
    right: Expression


@dataclass(frozen=True)
class FunctionCall(Expression):
    name: str
    arguments: tuple[Expression, ...]


@dataclass(frozen=True)
class Equation:
    left: Expression
    right: Expression
