from dataclasses import dataclass
from enum import Enum, auto


class TokenType(Enum):
    IDENTIFIER = auto()
    NUMBER = auto()
    STRING = auto()

    LBRACE = auto()
    RBRACE = auto()
    LPAREN = auto()
    RPAREN = auto()
    LBRACKET = auto()
    RBRACKET = auto()

    COLON = auto()
    COMMA = auto()
    SEMICOLON = auto()
    DOT = auto()

    EQUALS = auto()
    ARROW = auto()

    PLUS = auto()
    MINUS = auto()
    STAR = auto()
    SLASH = auto()
    CARET = auto()

    EOF = auto()


@dataclass(frozen=True)
class Token:
    type: TokenType
    value: str
    line: int
    column: int


class LexerError(Exception):
    pass


class Lexer:
    def __init__(self, source: str):
        self.source = source
        self.position = 0
        self.line = 1
        self.column = 1

    def tokenize(self) -> list[Token]:
        tokens = []

        while not self._at_end():
            char = self._peek()

            if char.isspace():
                self._advance_whitespace()
                continue

            if char == "/" and self._peek_next() == "/":
                self._skip_comment()
                continue

            if char.isalpha() or char == "_":
                tokens.append(self._identifier())
                continue

            if char.isdigit() or (char == "." and self._peek_next().isdigit()):
                tokens.append(self._number())
                continue

            if char == '"':
                tokens.append(self._string())
                continue

            token = self._symbol()

            if token is None:
                raise LexerError(
                    f"Unexpected character {char!r} "
                    f"at {self.line}:{self.column}"
                )

            tokens.append(token)

        tokens.append(
            Token(TokenType.EOF, "", self.line, self.column)
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
        self.column += 1
        return char

    def _advance_whitespace(self):
        while not self._at_end() and self._peek().isspace():
            if self._advance() == "\n":
                self.line += 1
                self.column = 1

    def _skip_comment(self):
        while not self._at_end() and self._peek() != "\n":
            self._advance()

    def _identifier(self) -> Token:
        line = self.line
        column = self.column
        start = self.position

        while (
            not self._at_end()
            and (self._peek().isalnum() or self._peek() == "_")
        ):
            self._advance()

        return Token(
            TokenType.IDENTIFIER,
            self.source[start:self.position],
            line,
            column,
        )

    def _number(self) -> Token:
        line = self.line
        column = self.column
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
            line,
            column,
        )

    def _string(self) -> Token:
        line = self.line
        column = self.column
        self._advance()

        chars = []

        while not self._at_end() and self._peek() != '"':
            chars.append(self._advance())

        if self._at_end():
            raise LexerError(
                f"Unterminated string at {line}:{column}"
            )

        self._advance()

        return Token(
            TokenType.STRING,
            "".join(chars),
            line,
            column,
        )

    def _symbol(self) -> Token | None:
        line = self.line
        column = self.column
        char = self._advance()

        symbols = {
            "{": TokenType.LBRACE,
            "}": TokenType.RBRACE,
            "(": TokenType.LPAREN,
            ")": TokenType.RPAREN,
            "[": TokenType.LBRACKET,
            "]": TokenType.RBRACKET,
            ":": TokenType.COLON,
            ",": TokenType.COMMA,
            ";": TokenType.SEMICOLON,
            ".": TokenType.DOT,
            "=": TokenType.EQUALS,
            "+": TokenType.PLUS,
            "-": TokenType.MINUS,
            "*": TokenType.STAR,
            "/": TokenType.SLASH,
            "^": TokenType.CARET,
        }

        if char == "-" and self._peek() == ">":
            self._advance()
            return Token(TokenType.ARROW, "->", line, column)

        token_type = symbols.get(char)

        if token_type is None:
            return None

        return Token(token_type, char, line, column)
