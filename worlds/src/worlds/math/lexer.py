from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, auto


class TokenType(Enum):
    NUMBER = auto()
    IDENTIFIER = auto()

    PLUS = auto()
    MINUS = auto()
    STAR = auto()
    SLASH = auto()
    CARET = auto()

    LPAREN = auto()
    RPAREN = auto()
    COMMA = auto()

    EQUALS = auto()
    EOF = auto()


@dataclass(frozen=True)
class Token:
    type: TokenType
    value: str
    position: int


class MathLexerError(Exception):
    pass


class MathLexer:
    def __init__(self, source: str):
        self.source = source
        self.position = 0

    def tokenize(self) -> list[Token]:
        tokens: list[Token] = []

        while not self._at_end():
            char = self._peek()

            if char.isspace():
                self._advance()
                continue

            if char.isdigit() or (
                char == "." and self._peek_next().isdigit()
            ):
                tokens.append(self._number())
                continue

            if char.isalpha() or char == "_":
                tokens.append(self._identifier())
                continue

            token_type = {
                "+": TokenType.PLUS,
                "-": TokenType.MINUS,
                "*": TokenType.STAR,
                "/": TokenType.SLASH,
                "^": TokenType.CARET,
                "(": TokenType.LPAREN,
                ")": TokenType.RPAREN,
                ",": TokenType.COMMA,
                "=": TokenType.EQUALS,
            }.get(char)

            if token_type is None:
                raise MathLexerError(
                    f"Unexpected character {char!r} "
                    f"at position {self.position}"
                )

            tokens.append(
                Token(
                    type=token_type,
                    value=char,
                    position=self.position,
                )
            )

            self._advance()

        tokens.append(
            Token(
                type=TokenType.EOF,
                value="",
                position=self.position,
            )
        )

        return tokens

    def _at_end(self) -> bool:
        return self.position >= len(self.source)

    def _peek(self) -> str:
        return self.source[self.position]

    def _peek_next(self) -> str:
        if self.position + 1 >= len(self.source):
            return ""
        return self.source[self.position + 1]

    def _advance(self) -> str:
        char = self.source[self.position]
        self.position += 1
        return char

    def _number(self) -> Token:
        start = self.position
        decimal_seen = False

        while not self._at_end():
            char = self._peek()

            if char.isdigit():
                self._advance()
                continue

            if char == "." and not decimal_seen:
                decimal_seen = True
                self._advance()
                continue

            break

        return Token(
            TokenType.NUMBER,
            self.source[start:self.position],
            start,
        )

    def _identifier(self) -> Token:
        start = self.position

        while (
            not self._at_end()
            and (
                self._peek().isalnum()
                or self._peek() == "_"
            )
        ):
            self._advance()

        return Token(
            TokenType.IDENTIFIER,
            self.source[start:self.position],
            start,
        )
