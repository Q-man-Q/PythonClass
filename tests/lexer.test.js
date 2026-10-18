import test from 'node:test';
import assert from 'node:assert';
import { tokenize, TokenType } from '../src/lexer.js';

test('tokenize simple assignment', () => {
  const code = 'x = 10 + 5';
  const tokens = tokenize(code);
  const types = tokens.map(t => t.type);
  assert.ok(types.includes(TokenType.NAME));
  assert.ok(types.includes(TokenType.OPERATOR));
  assert.ok(types.includes(TokenType.NUMBER));
  assert.strictEqual(tokens[0].value, 'x');
  assert.strictEqual(tokens[1].value, '=');
  assert.strictEqual(tokens[2].value, 10);
  assert.strictEqual(tokens[3].value, '+');
  assert.strictEqual(tokens[4].value, 5);
});

test('tokenize if-else with indentation', () => {
  const code = `if a > 0:\n    b = 1\nelse:\n    b = 2`;
  const tokens = tokenize(code);
  const indentCount = tokens.filter(t => t.type === TokenType.INDENT).length;
  const dedentCount = tokens.filter(t => t.type === TokenType.DEDENT).length;
  assert.strictEqual(indentCount, 2);
  assert.strictEqual(dedentCount, 2);
});

test('tokenize comments and empty lines', () => {
  const code = `# Comment\na = 1\n\n# Another comment\nb = 2`;
  const tokens = tokenize(code);
  const names = tokens.filter(t => t.type === TokenType.NAME).map(t => t.value);
  assert.deepStrictEqual(names, ['a', 'b']);
});
