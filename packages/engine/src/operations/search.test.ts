import { describeOperation, operations } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { listOperations } from './search';

it('lists every Operation with its description, enabled', () => {
  expect(listOperations('')).toEqual(
    Object.values(operations).map((operation) => ({
      ...describeOperation(operation),
      enabled: true,
      disabledReason: null,
    })),
  );
});

it('filters Operations by id, label and keywords, ignoring case', () => {
  expect(listOperations('PROJECT.LIST').map(({ id }) => id)).toContain(
    'project.list',
  );
  expect(listOperations('project.list').map(({ id }) => id)).not.toContain(
    'session.new',
  );
  expect(listOperations('nothing matches this')).toEqual([]);
});

const describedSchemas = (): unknown[] =>
  listOperations('').flatMap(({ params, result }) => [params, result]);

it('describes each Operation once, not at every listing', () => {
  const first = describedSchemas();

  for (const [index, schema] of describedSchemas().entries())
    expect(schema).toBe(first[index]);
});
