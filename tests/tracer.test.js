import test from 'node:test';
import assert from 'node:assert';
import { generateTrace } from '../src/tracer.js';

test('trace variable assignments and calculation', () => {
  const code = `a = 10
b = 5
c = a + b`;
  const result = generateTrace(code);
  assert.ok(result.steps.length > 5);
  const lastStep = result.steps[result.steps.length - 1];
  assert.strictEqual(lastStep.memory['a'].value, '10');
  assert.strictEqual(lastStep.memory['b'].value, '5');
  assert.strictEqual(lastStep.memory['c'].value, '15');
});

test('trace if-else branch execution', () => {
  const code = `score = 80
if score >= 60:
    res = "Сдал"
else:
    res = "Не сдал"`;
  const result = generateTrace(code);
  const lastStep = result.steps[result.steps.length - 1];
  assert.strictEqual(lastStep.memory['res'].value, '"Сдал"');
});

test('trace for in range loop', () => {
  const code = `sum = 0
for i in range(1, 4):
    sum += i`;
  const result = generateTrace(code);
  const lastStep = result.steps[result.steps.length - 1];
  assert.strictEqual(lastStep.memory['sum'].value, '6');
});

test('trace function call and return', () => {
  const code = `def double(x):
    return x * 2

val = double(7)`;
  const result = generateTrace(code);
  const lastStep = result.steps[result.steps.length - 1];
  assert.strictEqual(lastStep.memory['val'].value, '14');
});

test('trace list append and print', () => {
  const code = `items = [1, 2]
items.append(3)
print("Готово")`;
  const result = generateTrace(code);
  const lastStep = result.steps[result.steps.length - 1];
  assert.strictEqual(lastStep.stdout.trim(), 'Готово');
  assert.strictEqual(lastStep.memory['items'].value, '[1, 2, 3]');
});
