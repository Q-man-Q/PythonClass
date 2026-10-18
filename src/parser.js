/**
 * Educational Python Parser
 * Constructs an AST with exact node source spans for visualization.
 */

import { TokenType } from './lexer.js';

export class Parser {
  constructor(tokens) {
    // Filter out comments from active parsing tokens, but keep them accessible if needed
    this.allTokens = tokens;
    this.tokens = tokens.filter(t => t.type !== TokenType.COMMENT);
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos] || { type: TokenType.EOF, value: '', line: 0, col: 0 };
  }

  lookahead(offset = 1) {
    return this.tokens[this.pos + offset] || { type: TokenType.EOF, value: '', line: 0, col: 0 };
  }

  next() {
    const tok = this.peek();
    this.pos++;
    return tok;
  }

  match(type, value) {
    const tok = this.peek();
    if (tok.type !== type) return false;
    if (value !== undefined && tok.value !== value) return false;
    this.pos++;
    return tok;
  }

  expect(type, value) {
    const tok = this.peek();
    if (tok.type !== type || (value !== undefined && tok.value !== value)) {
      throw new Error(
        `Синтаксическая ошибка на строке ${tok.line}, колонка ${tok.col}: ожидалось '${value || type}', получено '${tok.value || tok.type}'`
      );
    }
    this.pos++;
    return tok;
  }

  skipNewlines() {
    while (this.peek().type === TokenType.NEWLINE) {
      this.pos++;
    }
  }

  parse() {
    this.skipNewlines();
    const body = [];
    while (this.peek().type !== TokenType.EOF) {
      const stmt = this.parseStatement();
      if (stmt) {
        body.push(stmt);
      }
      this.skipNewlines();
    }
    return {
      type: 'Program',
      body,
      line: 1,
      col: 0,
      endLine: body.length > 0 ? body[body.length - 1].endLine : 1,
      endCol: body.length > 0 ? body[body.length - 1].endCol : 0
    };
  }

  parseStatement() {
    this.skipNewlines();
    const tok = this.peek();
    if (tok.type === TokenType.EOF) return null;

    if (tok.type === TokenType.KEYWORD) {
      if (tok.value === 'if') return this.parseIf();
      if (tok.value === 'while') return this.parseWhile();
      if (tok.value === 'for') return this.parseFor();
      if (tok.value === 'def') return this.parseFunctionDef();
      if (tok.value === 'return') return this.parseReturn();
      if (tok.value === 'pass') {
        this.next();
        this.consumeStmtEnd();
        return { type: 'Pass', line: tok.line, col: tok.col, endLine: tok.endLine, endCol: tok.endCol };
      }
      if (tok.value === 'break') {
        this.next();
        this.consumeStmtEnd();
        return { type: 'Break', line: tok.line, col: tok.col, endLine: tok.endLine, endCol: tok.endCol };
      }
      if (tok.value === 'continue') {
        this.next();
        this.consumeStmtEnd();
        return { type: 'Continue', line: tok.line, col: tok.col, endLine: tok.endLine, endCol: tok.endCol };
      }
    }

    // Assignment or expression statement
    return this.parseSimpleStatement();
  }

  consumeStmtEnd() {
    if (this.peek().type === TokenType.NEWLINE) {
      this.next();
    } else if (this.peek().type === TokenType.DELIMITER && this.peek().value === ';') {
      this.next();
    }
  }

  parseBlock() {
    this.expect(TokenType.DELIMITER, ':');
    this.expect(TokenType.NEWLINE);
    this.expect(TokenType.INDENT);

    const body = [];
    while (this.peek().type !== TokenType.DEDENT && this.peek().type !== TokenType.EOF) {
      this.skipNewlines();
      if (this.peek().type === TokenType.DEDENT || this.peek().type === TokenType.EOF) break;
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
      this.skipNewlines();
    }
    if (this.peek().type === TokenType.DEDENT) {
      this.next();
    }
    return body;
  }

  parseIf() {
    const ifTok = this.expect(TokenType.KEYWORD, 'if');
    const test = this.parseExpression();
    const body = this.parseBlock();

    const elifs = [];
    while (this.peek().type === TokenType.KEYWORD && this.peek().value === 'elif') {
      const elifTok = this.next();
      const elifTest = this.parseExpression();
      const elifBody = this.parseBlock();
      elifs.push({
        type: 'Elif',
        test: elifTest,
        body: elifBody,
        line: elifTok.line,
        col: elifTok.col,
        endLine: elifBody.length ? elifBody[elifBody.length - 1].endLine : elifTok.endLine,
        endCol: elifBody.length ? elifBody[elifBody.length - 1].endCol : elifTok.endCol
      });
    }

    let orelse = null;
    if (this.peek().type === TokenType.KEYWORD && this.peek().value === 'else') {
      const elseTok = this.next();
      orelse = this.parseBlock();
    }

    const lastBody = orelse && orelse.length ? orelse : (elifs.length && elifs[elifs.length - 1].body.length ? elifs[elifs.length - 1].body : body);
    const endLine = lastBody.length ? lastBody[lastBody.length - 1].endLine : ifTok.endLine;
    const endCol = lastBody.length ? lastBody[lastBody.length - 1].endCol : ifTok.endCol;

    return {
      type: 'If',
      test,
      body,
      elifs,
      orelse,
      line: ifTok.line,
      col: ifTok.col,
      endLine,
      endCol
    };
  }

  parseWhile() {
    const whileTok = this.expect(TokenType.KEYWORD, 'while');
    const test = this.parseExpression();
    const body = this.parseBlock();

    const endLine = body.length ? body[body.length - 1].endLine : whileTok.endLine;
    const endCol = body.length ? body[body.length - 1].endCol : whileTok.endCol;

    return {
      type: 'While',
      test,
      body,
      line: whileTok.line,
      col: whileTok.col,
      endLine,
      endCol
    };
  }

  parseFor() {
    const forTok = this.expect(TokenType.KEYWORD, 'for');
    const targetTok = this.expect(TokenType.NAME);
    const target = {
      type: 'Name',
      id: targetTok.value,
      line: targetTok.line,
      col: targetTok.col,
      endLine: targetTok.endLine,
      endCol: targetTok.endCol
    };

    this.expect(TokenType.KEYWORD, 'in');
    const iter = this.parseExpression();
    const body = this.parseBlock();

    const endLine = body.length ? body[body.length - 1].endLine : forTok.endLine;
    const endCol = body.length ? body[body.length - 1].endCol : forTok.endCol;

    return {
      type: 'For',
      target,
      iter,
      body,
      line: forTok.line,
      col: forTok.col,
      endLine,
      endCol
    };
  }

  parseFunctionDef() {
    const defTok = this.expect(TokenType.KEYWORD, 'def');
    const nameTok = this.expect(TokenType.NAME);
    this.expect(TokenType.DELIMITER, '(');

    const params = [];
    if (!this.match(TokenType.DELIMITER, ')')) {
      while (true) {
        const paramTok = this.expect(TokenType.NAME);
        params.push({
          type: 'Name',
          id: paramTok.value,
          line: paramTok.line,
          col: paramTok.col,
          endLine: paramTok.endLine,
          endCol: paramTok.endCol
        });
        if (this.match(TokenType.DELIMITER, ',')) {
          if (this.peek().value === ')') {
            this.next();
            break;
          }
          continue;
        }
        this.expect(TokenType.DELIMITER, ')');
        break;
      }
    }

    const body = this.parseBlock();
    const endLine = body.length ? body[body.length - 1].endLine : defTok.endLine;
    const endCol = body.length ? body[body.length - 1].endCol : defTok.endCol;

    return {
      type: 'FunctionDef',
      name: nameTok.value,
      params,
      body,
      line: defTok.line,
      col: defTok.col,
      endLine,
      endCol
    };
  }

  parseReturn() {
    const retTok = this.expect(TokenType.KEYWORD, 'return');
    let value = null;
    if (this.peek().type !== TokenType.NEWLINE && this.peek().type !== TokenType.EOF) {
      value = this.parseExpression();
    }
    this.consumeStmtEnd();
    return {
      type: 'Return',
      value,
      line: retTok.line,
      col: retTok.col,
      endLine: value ? value.endLine : retTok.endLine,
      endCol: value ? value.endCol : retTok.endCol
    };
  }

  parseSimpleStatement() {
    const expr = this.parseExpression();

    // Check for assignment '=' or augmented assignment '+=', '-=', etc.
    const peekTok = this.peek();
    if (peekTok.type === TokenType.OPERATOR && peekTok.value === '=') {
      const opTok = this.next();
      const value = this.parseExpression();
      this.consumeStmtEnd();
      return {
        type: 'Assign',
        target: expr,
        value,
        line: expr.line,
        col: expr.col,
        endLine: value.endLine,
        endCol: value.endCol
      };
    }

    if (peekTok.type === TokenType.OPERATOR && ['+=', '-=', '*=', '/=', '//=', '**='].includes(peekTok.value)) {
      const opTok = this.next();
      const value = this.parseExpression();
      this.consumeStmtEnd();
      return {
        type: 'AugAssign',
        op: opTok.value.slice(0, -1),
        target: expr,
        value,
        line: expr.line,
        col: expr.col,
        endLine: value.endLine,
        endCol: value.endCol
      };
    }

    this.consumeStmtEnd();
    return {
      type: 'ExprStmt',
      value: expr,
      line: expr.line,
      col: expr.col,
      endLine: expr.endLine,
      endCol: expr.endCol
    };
  }

  // Expression Parsing with Operator Precedence

  parseExpression() {
    return this.parseLogicalOr();
  }

  parseLogicalOr() {
    let left = this.parseLogicalAnd();
    while (this.peek().type === TokenType.KEYWORD && this.peek().value === 'or') {
      const opTok = this.next();
      const right = this.parseLogicalAnd();
      left = {
        type: 'LogicalOp',
        op: 'or',
        left,
        right,
        line: left.line,
        col: left.col,
        endLine: right.endLine,
        endCol: right.endCol
      };
    }
    return left;
  }

  parseLogicalAnd() {
    let left = this.parseLogicalNot();
    while (this.peek().type === TokenType.KEYWORD && this.peek().value === 'and') {
      const opTok = this.next();
      const right = this.parseLogicalNot();
      left = {
        type: 'LogicalOp',
        op: 'and',
        left,
        right,
        line: left.line,
        col: left.col,
        endLine: right.endLine,
        endCol: right.endCol
      };
    }
    return left;
  }

  parseLogicalNot() {
    if (this.peek().type === TokenType.KEYWORD && this.peek().value === 'not') {
      const opTok = this.next();
      const argument = this.parseLogicalNot();
      return {
        type: 'UnaryOp',
        op: 'not',
        argument,
        line: opTok.line,
        col: opTok.col,
        endLine: argument.endLine,
        endCol: argument.endCol
      };
    }
    return this.parseComparison();
  }

  parseComparison() {
    let left = this.parseAddition();
    const compOps = ['==', '!=', '<', '<=', '>', '>=', 'in'];
    while (
      (this.peek().type === TokenType.OPERATOR && compOps.includes(this.peek().value)) ||
      (this.peek().type === TokenType.KEYWORD && (this.peek().value === 'in' || this.peek().value === 'is'))
    ) {
      const opTok = this.next();
      const right = this.parseAddition();
      left = {
        type: 'Compare',
        op: opTok.value,
        left,
        right,
        line: left.line,
        col: left.col,
        endLine: right.endLine,
        endCol: right.endCol
      };
    }
    return left;
  }

  parseAddition() {
    let left = this.parseMultiplication();
    while (this.peek().type === TokenType.OPERATOR && (this.peek().value === '+' || this.peek().value === '-')) {
      const opTok = this.next();
      const right = this.parseMultiplication();
      left = {
        type: 'BinOp',
        op: opTok.value,
        left,
        right,
        line: left.line,
        col: left.col,
        endLine: right.endLine,
        endCol: right.endCol
      };
    }
    return left;
  }

  parseMultiplication() {
    let left = this.parseUnary();
    while (
      this.peek().type === TokenType.OPERATOR &&
      (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '//' || this.peek().value === '%')
    ) {
      const opTok = this.next();
      const right = this.parseUnary();
      left = {
        type: 'BinOp',
        op: opTok.value,
        left,
        right,
        line: left.line,
        col: left.col,
        endLine: right.endLine,
        endCol: right.endCol
      };
    }
    return left;
  }

  parseUnary() {
    if (this.peek().type === TokenType.OPERATOR && (this.peek().value === '-' || this.peek().value === '+')) {
      const opTok = this.next();
      const argument = this.parseUnary();
      return {
        type: 'UnaryOp',
        op: opTok.value,
        argument,
        line: opTok.line,
        col: opTok.col,
        endLine: argument.endLine,
        endCol: argument.endCol
      };
    }
    return this.parsePower();
  }

  parsePower() {
    let left = this.parsePostfix();
    if (this.peek().type === TokenType.OPERATOR && this.peek().value === '**') {
      const opTok = this.next();
      const right = this.parseUnary(); // right-associative
      return {
        type: 'BinOp',
        op: '**',
        left,
        right,
        line: left.line,
        col: left.col,
        endLine: right.endLine,
        endCol: right.endCol
      };
    }
    return left;
  }

  parsePostfix() {
    let expr = this.parsePrimary();

    while (true) {
      // Function call: func(...)
      if (this.match(TokenType.DELIMITER, '(')) {
        const args = [];
        if (!this.match(TokenType.DELIMITER, ')')) {
          while (true) {
            args.push(this.parseExpression());
            if (this.match(TokenType.DELIMITER, ',')) {
              if (this.peek().value === ')') {
                this.next();
                break;
              }
              continue;
            }
            this.expect(TokenType.DELIMITER, ')');
            break;
          }
        }
        const lastTok = this.tokens[this.pos - 1];
        expr = {
          type: 'Call',
          func: expr,
          args,
          line: expr.line,
          col: expr.col,
          endLine: lastTok.endLine,
          endCol: lastTok.endCol
        };
        continue;
      }

      // Subscript or Index: arr[i]
      if (this.match(TokenType.DELIMITER, '[')) {
        const indexExpr = this.parseExpression();
        const closeTok = this.expect(TokenType.DELIMITER, ']');
        expr = {
          type: 'Subscript',
          value: expr,
          index: indexExpr,
          line: expr.line,
          col: expr.col,
          endLine: closeTok.endLine,
          endCol: closeTok.endCol
        };
        continue;
      }

      // Member or method call: obj.method
      if (this.match(TokenType.DELIMITER, '.')) {
        const memberTok = this.expect(TokenType.NAME);
        expr = {
          type: 'Member',
          object: expr,
          property: memberTok.value,
          line: expr.line,
          col: expr.col,
          endLine: memberTok.endLine,
          endCol: memberTok.endCol
        };
        continue;
      }

      break;
    }

    return expr;
  }

  parsePrimary() {
    const tok = this.peek();

    // Parenthesized expression
    if (this.match(TokenType.DELIMITER, '(')) {
      const expr = this.parseExpression();
      const closeTok = this.expect(TokenType.DELIMITER, ')');
      return {
        ...expr,
        line: tok.line,
        col: tok.col,
        endLine: closeTok.endLine,
        endCol: closeTok.endCol
      };
    }

    // List literal: [1, 2, 3]
    if (this.match(TokenType.DELIMITER, '[')) {
      const elements = [];
      if (!this.match(TokenType.DELIMITER, ']')) {
        while (true) {
          elements.push(this.parseExpression());
          if (this.match(TokenType.DELIMITER, ',')) {
            if (this.peek().value === ']') {
              this.next();
              break;
            }
            continue;
          }
          this.expect(TokenType.DELIMITER, ']');
          break;
        }
      }
      const closeTok = this.tokens[this.pos - 1];
      return {
        type: 'List',
        elements,
        line: tok.line,
        col: tok.col,
        endLine: closeTok.endLine,
        endCol: closeTok.endCol
      };
    }

    // Number literal
    if (tok.type === TokenType.NUMBER) {
      this.next();
      return {
        type: 'Literal',
        value: tok.value,
        raw: tok.raw,
        valueType: typeof tok.value === 'number' ? (Number.isInteger(tok.value) ? 'int' : 'float') : 'number',
        line: tok.line,
        col: tok.col,
        endLine: tok.endLine,
        endCol: tok.endCol
      };
    }

    // String literal
    if (tok.type === TokenType.STRING) {
      this.next();
      return {
        type: 'Literal',
        value: tok.value,
        raw: tok.raw,
        isFString: tok.isFString,
        valueType: 'str',
        line: tok.line,
        col: tok.col,
        endLine: tok.endLine,
        endCol: tok.endCol
      };
    }

    // Boolean or None keyword literal
    if (tok.type === TokenType.KEYWORD && (tok.value === true || tok.value === false || tok.value === null)) {
      this.next();
      return {
        type: 'Literal',
        value: tok.value,
        raw: tok.raw,
        valueType: tok.value === null ? 'NoneType' : 'bool',
        line: tok.line,
        col: tok.col,
        endLine: tok.endLine,
        endCol: tok.endCol
      };
    }

    // Name (identifier)
    if (tok.type === TokenType.NAME) {
      this.next();
      return {
        type: 'Name',
        id: tok.value,
        line: tok.line,
        col: tok.col,
        endLine: tok.endLine,
        endCol: tok.endCol
      };
    }

    throw new Error(
      `Синтаксическая ошибка на строке ${tok.line}, колонка ${tok.col}: неожиданный элемент '${tok.value || tok.type}'`
    );
  }
}

export function parse(tokens) {
  const parser = new Parser(tokens);
  return parser.parse();
}
