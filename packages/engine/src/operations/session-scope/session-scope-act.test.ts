import type { OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
import { asks, runs, scoped } from './scope-fixtures';

const sessionOnly = (sessionId: string): Json => ({ sessionId });

const act: [OperationId, (sessionId: string) => Json][] = [
  ['session.cancel', sessionOnly],
  ['session.rename', (sessionId): Json => ({ sessionId, title: 'Renamed' })],
  [
    'session.setConfigOption',
    (sessionId): Json => ({
      sessionId,
      configId: 'mode',
      type: 'id',
      value: 'x',
    }),
  ],
  ['session.savePlan', (sessionId): Json => ({ sessionId, plan: '# Plan' })],
  ['shell.stop', (sessionId): Json => ({ sessionId, shellId: 'shell-1' })],
  ['session.close', sessionOnly],
];

const targets = ['caller', 'started', 'unrelated', 'foreign', 'opening'];

it.each(act)(
  'runs %s on the caller and its started Sessions in its Project, asks otherwise, and only closes a Session still opening',
  async (id, params) => {
    const outcomes: Record<string, string> = {};

    for (const target of targets)
      outcomes[target] = (await scoped({ id, params: params(target) })).outcome;

    expect(outcomes).toEqual({
      caller: runs,
      started: runs,
      unrelated: asks,
      foreign: asks,
      opening: id === 'session.close' ? runs : 'NOT_FOUND',
    });
  },
);

it('shows the Operation label and description on the card', async () => {
  expect(
    (await scoped({ id: 'session.cancel', params: sessionOnly('unrelated') }))
      .cards,
  ).toEqual([
    {
      title: 'Cancel Session',
      description: 'Cancel the selected Session’s running Turn.',
    },
  ]);
});
