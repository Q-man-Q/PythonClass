import test from 'node:test';
import assert from 'node:assert';
import { tokenize } from '../src/lexer.js';
import { parse } from '../src/parser.js';

test('parse arithmetic assignment with precedence', () => {
  const code = 'total = 2 + 3 * 4';
  const ast = parse(tokenize(code));
  assert.strictEqual(ast.body.length, 1);
  const stmt = ast.body[0];
  assert.strictEqual(stmt.type, 'Assign');
  assert.strictEqual(stmt.target.id, 'total');
  assert.strictEqual(stmt.value.type, 'BinOp');
  assert.strictEqual(stmt.value.op, '+');
  assert.strictEqual(stmt.value.left.value, 2);
  assert.strictEqual(stmt.value.right.type, 'BinOp');
  assert.strictEqual(stmt.value.right.op, '*');
});

test('parse if elif else structure', () => {
  const code = `if x > 10:
    y = 1
elif x > 5:
    y = 2
else:
    y = 0`;
  const ast = parse(tokenize(code));
  const stmt = ast.body[0];
  assert.strictEqual(stmt.type, 'If');
  assert.strictEqual(stmt.test.op, '>');
  assert.strictEqual(stmt.body.length, 1);
  assert.strictEqual(stmt.elifs.length, 1);
  assert.strictEqual(stmt.elifs[0].test.op, '>');
  assert.strictEqual(stmt.orelse.length, 1);
});

test('parse for in range loop', () => {
  const code = `for i in range(1, 4):
    print(i)`;
  const ast = parse(tokenize(code));
  const stmt = ast.body[0];
  assert.strictEqual(stmt.type, 'For');
  assert.strictEqual(stmt.target.id, 'i');
  assert.strictEqual(stmt.iter.type, 'Call');
  assert.strictEqual(stmt.iter.func.id, 'range');
  assert.strictEqual(stmt.body.length, 1);
});

test('parse function definition and call', () => {
  const code = `def square(n):
    return n * n

res = square(5)`;
  const ast = parse(tokenize(code));
  assert.strictEqual(ast.body.length, 2);
  assert.strictEqual(ast.body[0].type, 'FunctionDef');
  assert.strictEqual(ast.body[0].name, 'square');
  assert.strictEqual(ast.body[0].params[0].id, 'n');
  assert.strictEqual(ast.body[1].type, 'Assign');
  assert.strictEqual(ast.body[1].value.type, 'Call');
});
