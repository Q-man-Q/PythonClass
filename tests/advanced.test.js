import test from 'node:test';
import assert from 'node:assert';
import { generateTrace } from '../src/tracer.js';

test('nested loops and string operations', () => {
  const code = `
pattern = ""
for i in range(2):
    for j in range(2):
        pattern = pattern + "*"
`;
  const result = generateTrace(code);
  const lastStep = result.steps[result.steps.length - 1];
  assert.strictEqual(lastStep.memory['pattern'].value, '"****"');
});

test('string multiplication and boolean logic', () => {
  const code = `
ha = "ha" * 3
flag = not (5 < 3)
`;
  const result = generateTrace(code);
  const lastStep = result.steps[result.steps.length - 1];
  assert.strictEqual(lastStep.memory['ha'].value, '"hahaha"');
  assert.strictEqual(lastStep.memory['flag'].value, 'True');
});

test('list index access and calculation', () => {
  const code = `
nums = [10, 25, 5]
sum_val = nums[0] + nums[1]
diff = nums[1] - nums[2]
`;
  const result = generateTrace(code);
  const lastStep = result.steps[result.steps.length - 1];
  assert.strictEqual(lastStep.memory['sum_val'].value, '35');
  assert.strictEqual(lastStep.memory['diff'].value, '20');
});
