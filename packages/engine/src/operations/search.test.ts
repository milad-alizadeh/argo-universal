import { describeOperation, operations } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { availableOperations } from './operation-permission';
import { listOperations } from './search';

const appOnly = new Set([
  'session.submit',
  'session.queue',
  'conversation.status',
  'conversation.start',
  'conversation.end',
  'conversation.setSettings',
  'voice.preview',
  'voice.getPreviewClip',
  'voice.storePreviewClip',
  'terminal.resize',
  'terminal.close',
  'terminal.open',
]);

it('lists every Operation but the App-only ones with its description, enabled', () => {
  expect(availableOperations(listOperations(''), true)).toEqual(
    Object.values(operations)
      .filter(({ id }) => !appOnly.has(id))
      .map((operation) => ({
        ...describeOperation(operation),
        ...approvalFor(operation.policy),
        enabled: true,
        disabledReason: null,
      })),
  );
});

it('filters Operations by id, label and keywords, ignoring case, and finds nothing for no word near any', () => {
  expect(listOperations('PROJECT.LIST').map(({ id }) => id)).toContain(
    'project.list',
  );
  expect(listOperations('project.list').map(({ id }) => id)).not.toContain(
    'session.new',
  );
  expect(listOperations('xyzzy')).toEqual([]);
});

const describedSchemas = (): unknown[] =>
  listOperations('').flatMap(({ params, result }) => [params, result]);

it('describes each Operation once, not at every listing', () => {
  const first = describedSchemas();

  for (const [index, schema] of describedSchemas().entries())
    expect(schema).toBe(first[index]);
});

function approvalFor(policy: string): { canRequestApproval?: boolean } {
  return ['ask', 'archive', 'ask-outside-project'].includes(policy)
    ? { canRequestApproval: true }
    : {};
}
