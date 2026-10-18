/**
 * Educational Python Lexer
 * Tokenizes Python code with exact character, line, and column spans.
 * Accurately tracks indentation (INDENT, DEDENT) and comments.
 */

export const TokenType = {
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  NAME: 'NAME',
  KEYWORD: 'KEYWORD',
  OPERATOR: 'OPERATOR',
  DELIMITER: 'DELIMITER',
  INDENT: 'INDENT',
  DEDENT: 'DEDENT',
  NEWLINE: 'NEWLINE',
  COMMENT: 'COMMENT',
  EOF: 'EOF'
};

export const KEYWORDS = new Set([
  'if', 'elif', 'else', 'while', 'for', 'in', 'def', 'return',
  'break', 'continue', 'and', 'or', 'not', 'True', 'False', 'None',
  'pass', 'import', 'from', 'as', 'try', 'except', 'finally', 'class'
]);

export const MULTI_CHAR_OPS = [
  '**=', '//=', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '//', '**'
];

export const SINGLE_CHAR_OPS = new Set(['+', '-', '*', '/', '%', '<', '>', '=', '!']);
export const DELIMITERS = new Set(['(', ')', '[', ']', '{', '}', ':', ',', '.', ';']);

export class Tokenizer {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.col = 0;
    this.indentStack = [0];
    this.tokens = [];
    this.atLineStart = true;
  }

  tokenize() {
    this.tokens = [];
    this.indentStack = [0];
    this.pos = 0;
    this.line = 1;
    this.col = 0;
    this.atLineStart = true;

    while (this.pos < this.source.length) {
      if (this.atLineStart) {
        this.handleLineStart();
        if (this.pos >= this.source.length) break;
      }

      const ch = this.source[this.pos];

      // Newlines
      if (ch === '\n' || ch === '\r') {
        const startLine = this.line;
        const startCol = this.col;
        const startOffset = this.pos;

        if (ch === '\r' && this.source[this.pos + 1] === '\n') {
          this.pos++;
        }
        this.pos++;
        this.line++;
        this.col = 0;
        this.atLineStart = true;

        // Only emit NEWLINE if the last token wasn't already a NEWLINE, INDENT, or DEDENT
        const prev = this.tokens[this.tokens.length - 1];
        if (prev && prev.type !== TokenType.NEWLINE && prev.type !== TokenType.INDENT) {
          this.tokens.push({
            type: TokenType.NEWLINE,
            value: '\n',
            line: startLine,
            col: startCol,
            endLine: startLine,
            endCol: startCol + 1,
            start: startOffset,
            end: this.pos
          });
        }
        continue;
      }

      // Whitespace inside line
      if (ch === ' ' || ch === '\t') {
        this.pos++;
        this.col++;
        continue;
      }

      // Comments
      if (ch === '#') {
        const startLine = this.line;
        const startCol = this.col;
        const startOffset = this.pos;
        let commentText = '';
        while (this.pos < this.source.length && this.source[this.pos] !== '\n' && this.source[this.pos] !== '\r') {
          commentText += this.source[this.pos];
          this.pos++;
          this.col++;
        }
        this.tokens.push({
          type: TokenType.COMMENT,
          value: commentText,
          line: startLine,
          col: startCol,
          endLine: startLine,
          endCol: this.col,
          start: startOffset,
          end: this.pos
        });
        continue;
      }

      // Numbers (decimal integers and floats)
      if (this.isDigit(ch) || (ch === '.' && this.isDigit(this.source[this.pos + 1]))) {
        this.readNumber();
        continue;
      }

      // Strings ('...', "...", triple quotes, f-strings)
      if (ch === '"' || ch === "'" || ((ch === 'f' || ch === 'F') && (this.source[this.pos + 1] === '"' || this.source[this.pos + 1] === "'"))) {
        this.readString();
        continue;
      }

      // Identifiers and Keywords
      if (this.isIdentStart(ch)) {
        this.readIdentifierOrKeyword();
        continue;
      }

      // Multi-char operators
      const twoChar = this.source.slice(this.pos, this.pos + 2);
      const threeChar = this.source.slice(this.pos, this.pos + 3);

      if (MULTI_CHAR_OPS.includes(threeChar)) {
        this.pushToken(TokenType.OPERATOR, threeChar, 3);
        continue;
      }
      if (MULTI_CHAR_OPS.includes(twoChar)) {
        this.pushToken(TokenType.OPERATOR, twoChar, 2);
        continue;
      }

      // Single-char operators
      if (SINGLE_CHAR_OPS.has(ch)) {
        this.pushToken(TokenType.OPERATOR, ch, 1);
        continue;
      }

      // Delimiters
      if (DELIMITERS.has(ch)) {
        this.pushToken(TokenType.DELIMITER, ch, 1);
        continue;
      }

      // Unknown character fallback
      this.pushToken('UNKNOWN', ch, 1);
    }

    // Trailing newline if needed
    const lastTok = this.tokens[this.tokens.length - 1];
    if (lastTok && lastTok.type !== TokenType.NEWLINE) {
      this.tokens.push({
        type: TokenType.NEWLINE,
        value: '\n',
        line: this.line,
        col: this.col,
        endLine: this.line,
        endCol: this.col,
        start: this.pos,
        end: this.pos
      });
    }

    // Unwind indentation stack down to 0
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      this.tokens.push({
        type: TokenType.DEDENT,
        value: '',
        line: this.line,
        col: this.col,
        endLine: this.line,
        endCol: this.col,
        start: this.pos,
        end: this.pos
      });
    }

    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      line: this.line,
      col: this.col,
      endLine: this.line,
      endCol: this.col,
      start: this.pos,
      end: this.pos
    });

    return this.tokens;
  }

  handleLineStart() {
    let indent = 0;
    let scanPos = this.pos;
    let scanCol = 0;

    while (scanPos < this.source.length) {
      const c = this.source[scanPos];
      if (c === ' ') {
        indent++;
        scanPos++;
        scanCol++;
      } else if (c === '\t') {
        indent += 4;
        scanPos++;
        scanCol += 4;
      } else {
        break;
      }
    }

    // Check if line is empty or comment-only
    if (scanPos < this.source.length) {
      const nextC = this.source[scanPos];
      if (nextC === '\n' || nextC === '\r' || nextC === '#') {
        // Skip emitting INDENT/DEDENT for empty/comment lines
        this.pos = scanPos;
        this.col = scanCol;
        this.atLineStart = false;
        return;
      }
    } else {
      // Reached EOF
      this.pos = scanPos;
      this.col = scanCol;
      this.atLineStart = false;
      return;
    }

    // Process indentation difference
    const currentIndent = this.indentStack[this.indentStack.length - 1];
    if (indent > currentIndent) {
      this.indentStack.push(indent);
      this.tokens.push({
        type: TokenType.INDENT,
        value: indent,
        line: this.line,
        col: 0,
        endLine: this.line,
        endCol: scanCol,
        start: this.pos,
        end: scanPos
      });
    } else if (indent < currentIndent) {
      while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indent) {
        this.indentStack.pop();
        this.tokens.push({
          type: TokenType.DEDENT,
          value: indent,
          line: this.line,
          col: 0,
          endLine: this.line,
          endCol: scanCol,
          start: this.pos,
          end: scanPos
        });
      }
    }

    this.pos = scanPos;
    this.col = scanCol;
    this.atLineStart = false;
  }

  readNumber() {
    const startLine = this.line;
    const startCol = this.col;
    const startOffset = this.pos;
    let numStr = '';
    let hasDot = false;

    while (this.pos < this.source.length) {
      const c = this.source[this.pos];
      if (this.isDigit(c)) {
        numStr += c;
        this.pos++;
        this.col++;
      } else if (c === '.' && !hasDot && this.isDigit(this.source[this.pos + 1])) {
        hasDot = true;
        numStr += c;
        this.pos++;
        this.col++;
      } else {
        break;
      }
    }

    const value = hasDot ? parseFloat(numStr) : parseInt(numStr, 10);
    this.tokens.push({
      type: TokenType.NUMBER,
      value,
      raw: numStr,
      line: startLine,
      col: startCol,
      endLine: this.line,
      endCol: this.col,
      start: startOffset,
      end: this.pos
    });
  }

  readString() {
    const startLine = this.line;
    const startCol = this.col;
    const startOffset = this.pos;
    let isFString = false;

    if (this.source[this.pos] === 'f' || this.source[this.pos] === 'F') {
      isFString = true;
      this.pos++;
      this.col++;
    }

    const quoteChar = this.source[this.pos];
    let isTriple = false;
    if (this.source.slice(this.pos, this.pos + 3) === quoteChar.repeat(3)) {
      isTriple = true;
      this.pos += 3;
      this.col += 3;
    } else {
      this.pos++;
      this.col++;
    }

    let strVal = '';
    while (this.pos < this.source.length) {
      if (isTriple) {
        if (this.source.slice(this.pos, this.pos + 3) === quoteChar.repeat(3)) {
          this.pos += 3;
          this.col += 3;
          break;
        }
      } else {
        if (this.source[this.pos] === quoteChar) {
          this.pos++;
          this.col++;
          break;
        }
        if (this.source[this.pos] === '\n') {
          // Unclosed string on single line
          break;
        }
      }

      if (this.source[this.pos] === '\\' && this.pos + 1 < this.source.length) {
        const next = this.source[this.pos + 1];
        if (next === 'n') strVal += '\n';
        else if (next === 't') strVal += '\t';
        else if (next === 'r') strVal += '\r';
        else if (next === '\\') strVal += '\\';
        else if (next === quoteChar) strVal += quoteChar;
        else strVal += next;
        this.pos += 2;
        this.col += 2;
      } else {
        if (this.source[this.pos] === '\n') {
          this.line++;
          this.col = 0;
        } else {
          this.col++;
        }
        strVal += this.source[this.pos];
        this.pos++;
      }
    }

    this.tokens.push({
      type: TokenType.STRING,
      value: strVal,
      raw: this.source.slice(startOffset, this.pos),
      isFString,
      line: startLine,
      col: startCol,
      endLine: this.line,
      endCol: this.col,
      start: startOffset,
      end: this.pos
    });
  }

  readIdentifierOrKeyword() {
    const startLine = this.line;
    const startCol = this.col;
    const startOffset = this.pos;
    let ident = '';

    while (this.pos < this.source.length && this.isIdentPart(this.source[this.pos])) {
      ident += this.source[this.pos];
      this.pos++;
      this.col++;
    }

    let type = KEYWORDS.has(ident) ? TokenType.KEYWORD : TokenType.NAME;
    let value = ident;
    if (ident === 'True') value = true;
    else if (ident === 'False') value = false;
    else if (ident === 'None') value = null;

    this.tokens.push({
      type,
      value,
      raw: ident,
      line: startLine,
      col: startCol,
      endLine: this.line,
      endCol: this.col,
      start: startOffset,
      end: this.pos
    });
  }

  pushToken(type, value, length) {
    const startLine = this.line;
    const startCol = this.col;
    const startOffset = this.pos;

    this.pos += length;
    this.col += length;

    this.tokens.push({
      type,
      value,
      line: startLine,
      col: startCol,
      endLine: this.line,
      endCol: this.col,
      start: startOffset,
      end: this.pos
    });
  }

  isDigit(c) {
    return c >= '0' && c <= '9';
  }

  isIdentStart(c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' ||
           (c >= '\u0400' && c <= '\u04FF'); // Allow Russian letters in identifiers if kids write in Russian!
  }

  isIdentPart(c) {
    return this.isIdentStart(c) || this.isDigit(c);
  }
}

export function tokenize(source) {
  const tokenizer = new Tokenizer(source);
  return tokenizer.tokenize();
}
