import type { SessionListInput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { insertEndedTurn } from '#mocks/database';
import { rejectedProcedureCode } from '#mocks/procedure-request';

const pagingInputs: SessionListInput[] = [
  { archived: false },
  { archived: false, direction: 'forward' },
];

it.each(pagingInputs)(
  'lists stored Sessions without starting their Agent: %j',
  async (input): Promise<void> => {
    const { caller, agent, database } = await startAcpEngine({ steps: [] });
    insertEndedTurn(database);
    expect(await caller.session.list(input)).toMatchObject({
      sessions: [{ sessionId: 'session-1' }],
      nextCursor: null,
    });
    expect(agent.processes).toHaveLength(0);
  },
);

it('rejects an unsupported Session paging direction', async (): Promise<void> => {
  const { url } = await startAcpEngine({ steps: [] });
  expect(
    await rejectedProcedureCode(url, {
      path: 'session.list',
      type: 'query',
      input: JSON.stringify({ archived: false, direction: 'backward' }),
    }),
  ).toBe('BAD_REQUEST');
});

it.each([
  { sessionId: 'session-1' },
  { sessionId: 'session-1', title: 42 },
  { sessionId: 'session-1', title: 'New title', titleSource: 'manual' },
])(
  'rejects a malformed rename input before its handler: %j',
  async (input): Promise<void> => {
    const { url } = await startAcpEngine({ steps: [] });
    expect(
      await rejectedProcedureCode(url, {
        path: 'session.rename',
        type: 'mutation',
        input: JSON.stringify(input),
      }),
    ).toBe('BAD_REQUEST');
  },
);
