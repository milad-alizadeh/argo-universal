import { expect, it } from 'vitest';
import { describeOperation, operations } from '.';

// An Agent reads a description whole, so none may flood its context.
const describedLimit = 40_000;

it('describes every Operation in under 40 KB', () => {
  const oversized = Object.values(operations)
    .map((operation) => ({
      id: operation.id,
      size: JSON.stringify(describeOperation(operation)).length,
    }))
    .filter(({ size }) => size > describedLimit);

  expect(oversized).toEqual([]);
});

it('names a Plugin manifest in plugin.list’s result instead of spelling it out', () => {
  const { result } = describeOperation(operations['plugin.list']);

  expect(JSON.stringify(result)).toContain('manifest');
  expect(JSON.stringify(result).length).toBeLessThan(5000);
});
