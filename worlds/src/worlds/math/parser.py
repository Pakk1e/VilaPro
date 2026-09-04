from __future__ import annotations

from .ast import (
    Binary,
    Equation,
    Expression,
    FunctionCall,
    Number,
    Unary,
    Variable,
)
from .lexer import MathLexer, Token, TokenType


class MathParserError(Exception):
    pass


class MathParser:
    def __init__(self, source: str):
        self.tokens = MathLexer(source).tokenize()
        self.position = 0

    def parse_expression(self) -> Expression:
        expression = self._parse_addition()
        self._expect(TokenType.EOF)
        return expression

    def parse_equation(self) -> Equation:
        left = self._parse_addition()
        self._expect(TokenType.EQUALS)
        right = self._parse_addition()
        self._expect(TokenType.EOF)

        return Equation(
            left=left,
            right=right,
        )

    def _parse_addition(self) -> Expression:
        expression = self._parse_multiplication()

        while self._match(
            TokenType.PLUS,
            TokenType.MINUS,
        ):
            operator = self._previous().value
            right = self._parse_multiplication()

            expression = Binary(
                left=expression,
                operator=operator,
                right=right,
            )

        return expression

    def _parse_multiplication(self) -> Expression:
        expression = self._parse_power()

        while self._match(
            TokenType.STAR,
            TokenType.SLASH,
        ):
            operator = self._previous().value
            right = self._parse_power()

            expression = Binary(
                left=expression,
                operator=operator,
                right=right,
            )

        return expression

    def _parse_power(self) -> Expression:
        expression = self._parse_unary()

        if self._match(TokenType.CARET):
            right = self._parse_power()

            expression = Binary(
                left=expression,
                operator="^",
                right=right,
            )

        return expression

    def _parse_unary(self) -> Expression:
        if self._match(
            TokenType.PLUS,
            TokenType.MINUS,
        ):
            operator = self._previous().value

            return Unary(
                operator=operator,
                operand=self._parse_unary(),
            )

        return self._parse_primary()

    def _parse_primary(self) -> Expression:
        if self._match(TokenType.NUMBER):
            return Number(
                float(self._previous().value)
            )

        if self._match(TokenType.IDENTIFIER):
            name = self._previous().value

            if self._match(TokenType.LPAREN):
                return self._parse_function_call(name)

            return Variable(name)

        if self._match(TokenType.LPAREN):
            expression = self._parse_addition()
            self._expect(TokenType.RPAREN)
            return expression

        self._error("Expected expression")

    def _parse_function_call(
        self,
        name: str,
    ) -> FunctionCall:
        arguments = []

        if not self._check(TokenType.RPAREN):
            arguments.append(self._parse_addition())

            while self._match(TokenType.COMMA):
                arguments.append(self._parse_addition())

        self._expect(TokenType.RPAREN)

        return FunctionCall(
            name=name,
            arguments=tuple(arguments),
        )

    def _match(self, *types: TokenType) -> bool:
        for token_type in types:
            if self._check(token_type):
                self.position += 1
                return True

        return False

    def _check(self, token_type: TokenType) -> bool:
        return self._peek().type == token_type

    def _expect(self, token_type: TokenType) -> Token:
        if not self._check(token_type):
            self._error(
                f"Expected {token_type.name}, "
                f"got {self._peek().type.name}"
            )

        return self._advance()

    def _advance(self) -> Token:
        token = self.tokens[self.position]
        self.position += 1
        return token

    def _previous(self) -> Token:
        return self.tokens[self.position - 1]

    def _peek(self) -> Token:
        return self.tokens[self.position]

    def _error(self, message: str):
        token = self._peek()

        raise MathParserError(
            f"{message} at position {token.position}"
        )
