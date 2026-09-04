from .ast import (
    Component,
    Parameter,
    Port,
    Quantity,
    Representation,
    Unit,
    PortTypeDefinition,
    World,
)
from worlds.math import MathParser
from .lexer import Lexer, Token, TokenType


class ParserError(Exception):
    pass


class Parser:
    def __init__(self, source: str):
        self.tokens = Lexer(source).tokenize()
        self.position = 0

    def parse(self) -> World:
        self._expect_identifier("world")
        name = self._expect(TokenType.IDENTIFIER).value

        self._expect(TokenType.LBRACE)

        quantities = []
        units = []
        port_types = []
        components = []

        while not self._check(TokenType.RBRACE):
            keyword = self._peek().value

            if keyword == "quantity":
                quantities.append(self._parse_quantity())
            elif keyword == "unit":
                units.append(self._parse_unit())
            elif keyword == "port_type":
                port_types.append(self._parse_port_type())
            elif keyword == "component":
                components.append(self._parse_component())
            else:
                self._error(
                    f"Unexpected declaration {keyword!r}"
                )

        self._expect(TokenType.RBRACE)
        self._expect(TokenType.EOF)

        return World(
            name=name,
            quantities=quantities,
            units=units,
            port_types=port_types,
            components=components,
        )

    def _parse_port_type(self) -> PortTypeDefinition:
        self._expect_identifier("port_type")

        name = self._expect(
            TokenType.IDENTIFIER
        ).value

        self._expect(TokenType.SEMICOLON)

        return PortTypeDefinition(name=name)

    def _parse_quantity(self) -> Quantity:
        self._expect_identifier("quantity")

        name = self._expect(TokenType.IDENTIFIER).value

        # Backwards-compatible short form:
        #
        #     quantity Voltage
        #
        if self._optional(TokenType.SEMICOLON):
            return Quantity(name=name)

        self._expect(TokenType.LBRACE)

        dimension = None
        unit = None

        while not self._check(TokenType.RBRACE):
            declaration = self._expect(TokenType.IDENTIFIER).value

            self._expect(TokenType.COLON)

            expression = self._collect_until(TokenType.SEMICOLON)

            self._expect(TokenType.SEMICOLON)

            if declaration == "dimension":
                dimension = expression

            elif declaration == "unit":
                unit = expression

            else:
                self._error(
                    f"Unknown quantity declaration {declaration!r}"
                )

        self._expect(TokenType.RBRACE)

        return Quantity(
            name=name,
            dimension=dimension,
            unit=unit,
        )

    def _parse_unit(self) -> Unit:
        self._expect_identifier("unit")
        name = self._expect(TokenType.IDENTIFIER).value
        self._expect(TokenType.EQUALS)

        expression = self._collect_until(TokenType.SEMICOLON)

        self._expect(TokenType.SEMICOLON)

        return Unit(
            name=name,
            expression=expression,
        )

    def _parse_component(self) -> Component:
        self._expect_identifier("component")
        name = self._expect(TokenType.IDENTIFIER).value

        self._expect(TokenType.LBRACE)

        parameters = []
        ports = []
        representations = []

        while not self._check(TokenType.RBRACE):
            keyword = self._peek().value

            if keyword == "parameter":
                parameters.append(self._parse_parameter())

            elif keyword == "interface":
                ports.extend(self._parse_interface())

            elif keyword == "representation":
                representations.append(
                    self._parse_representation()
                )

            else:
                self._error(
                    f"Unexpected component declaration {keyword!r}"
                )

        self._expect(TokenType.RBRACE)

        return Component(
            name=name,
            parameters=parameters,
            ports=ports,
            representations=representations,
        )

    def _parse_parameter(self) -> Parameter:
        self._expect_identifier("parameter")

        name = self._expect(TokenType.IDENTIFIER).value

        self._expect(TokenType.COLON)

        type_name = self._expect(TokenType.IDENTIFIER).value

        self._optional(TokenType.SEMICOLON)

        return Parameter(
            name=name,
            type_name=type_name,
        )

    def _parse_interface(self) -> list[Port]:
        self._expect_identifier("interface")
        self._expect(TokenType.LBRACE)

        ports = []

        while not self._check(TokenType.RBRACE):
            name = self._expect(TokenType.IDENTIFIER).value

            self._expect(TokenType.COLON)

            type_name = self._expect(TokenType.IDENTIFIER).value

            self._optional(TokenType.SEMICOLON)

            ports.append(
                Port(
                    name=name,
                    type_name=type_name,
                )
            )

        self._expect(TokenType.RBRACE)

        return ports

    def _parse_representation(self) -> Representation:
        self._expect_identifier("representation")

        name = self._expect(TokenType.IDENTIFIER).value

        self._expect(TokenType.LBRACE)

        equations = []

        while not self._check(TokenType.RBRACE):
            keyword = self._peek().value

            if keyword == "equation":
                self._advance()

                self._expect(TokenType.COLON)

                expression = self._collect_until(
                    TokenType.SEMICOLON
                )

                self._expect(TokenType.SEMICOLON)

                equations.append(
                    MathParser(expression).parse_equation()
                )
            else:
                self._error(
                    f"Unexpected representation declaration "
                    f"{keyword!r}"
                )

        self._expect(TokenType.RBRACE)

        return Representation(
            name=name,
            equations=equations,
        )

    def _collect_until(self, token_type: TokenType) -> str:
        values = []

        while not self._check(token_type):
            if self._check(TokenType.EOF):
                self._error(
                    f"Expected {token_type.name}"
                )

            values.append(self._advance().value)

        return " ".join(values)

    def _expect_identifier(self, value: str):
        token = self._expect(TokenType.IDENTIFIER)

        if token.value != value:
            self._error(
                f"Expected {value!r}, got {token.value!r}",
                token,
            )

    def _expect(self, token_type: TokenType) -> Token:
        token = self._peek()

        if token.type != token_type:
            self._error(
                f"Expected {token_type.name}, got "
                f"{token.type.name}",
                token,
            )

        self.position += 1
        return token

    def _optional(self, token_type: TokenType) -> bool:
        if self._check(token_type):
            self.position += 1
            return True

        return False

    def _check(self, token_type: TokenType) -> bool:
        return self._peek().type == token_type

    def _peek(self) -> Token:
        return self.tokens[self.position]

    def _advance(self) -> Token:
        token = self.tokens[self.position]
        self.position += 1
        return token

    def _error(self, message: str, token: Token | None = None):
        token = token or self._peek()
        raise ParserError(
            f"{message} at {token.line}:{token.column}"
        )
