import type { OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
import { runs, scoped } from './scope-fixtures';

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
  ['shell.stop', (sessionId): Json => ({ sessionId, shellId: 'shell-1' })],
];

const targets = ['caller', 'started', 'unrelated', 'foreign', 'opening'];

it.each(act)(
  'admits %s without consulting Session ownership',
  async (id, params) => {
    const outcomes: Record<string, string> = {};

    for (const target of targets)
      outcomes[target] = (await scoped({ id, params: params(target) })).outcome;

    expect(outcomes).toEqual({
      caller: runs,
      started: runs,
      unrelated: runs,
      foreign: runs,
      opening: runs,
    });
  },
);

it('hangs up only the calling Session, refusing conversation.hangUp for any other Session', async () => {
  const outcomes: Record<string, string> = {};

  for (const target of targets)
    outcomes[target] = (
      await scoped({ id: 'conversation.hangUp', params: sessionOnly(target) })
    ).outcome;

  expect(outcomes).toEqual({
    caller: runs,
    started: 'FORBIDDEN',
    unrelated: 'FORBIDDEN',
    foreign: 'FORBIDDEN',
    opening: 'FORBIDDEN',
  });
});

it('hangs up the calling Session when conversation.hangUp names no Session', async () => {
  expect(
    (await scoped({ id: 'conversation.hangUp', params: {} })).outcome,
  ).toBe(runs);
});

it('shows the Operation label and description on the card', async () => {
  expect(
    (await scoped({ id: 'session.clear', params: sessionOnly('unrelated') }))
      .cards,
  ).toEqual([
    {
      title: 'Clear context',
      description: expect.stringContaining('empty context'),
    },
  ]);
});
