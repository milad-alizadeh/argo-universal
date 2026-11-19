import { describeOperation, operations } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { listOperations } from './search';

const appOnly = new Set([
  'session.submit',
  'session.queue',
  'voice.status',
  'voice.start',
  'voice.end',
  'voice.setSettings',
  'voice.preview',
  'voice.getPreviewClip',
  'voice.storePreviewClip',
]);

it('lists every Operation but the App-only ones with its description, enabled', () => {
  expect(listOperations('')).toEqual(
    Object.values(operations)
      .filter(({ id }) => !appOnly.has(id))
      .map((operation) => ({
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
