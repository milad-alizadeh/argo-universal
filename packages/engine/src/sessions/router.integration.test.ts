import type { SessionListInput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';

const pagingInputs: SessionListInput[] = [
  { archived: false },
  { archived: false, direction: 'forward' },
];
it.each(pagingInputs)(
  'lists stored Sessions without starting their Agent: %j',
  async (input): Promise<void> => {
    const { caller, agent } = await startAcpEngine({ steps: [] });
    expect(await caller.session.list(input)).toMatchObject({
      sessions: [{ sessionId: 'session-1' }],
      nextCursor: null,
    });
    expect(agent.processes).toHaveLength(0);
  },
);

it('rejects an unsupported Session paging direction', async (): Promise<void> => {
  const { caller } = await startAcpEngine({ steps: [] });
  await expect(
    Reflect.apply(caller.session.list, undefined, [
      { archived: false, direction: 'backward' },
    ]),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});

it.each([
  {
    procedure: 'rename',
    input: { sessionId: 'session-1', title: 'New title' },
    message: 'Session rename is not implemented yet',
  },
  {
    procedure: 'answerPlanProposal',
    input: { sessionId: 'session-1', planId: 'plan', decision: 'approve' },
    message: 'Plan proposal answers are not implemented yet',
  },
  {
    procedure: 'changes',
    input: { sessionId: 'session-1' },
    message: 'This procedure is not implemented yet',
  },
  {
    procedure: 'diff',
    input: { sessionId: 'session-1', path: 'file.ts' },
    message: 'This procedure is not implemented yet',
  },
] as const)(
  'preserves the unimplemented $procedure error',
  async ({ procedure, input, message }): Promise<void> => {
    const { caller } = await startAcpEngine({ steps: [] });
    await expect(
      Reflect.apply(caller.session[procedure], undefined, [input]),
    ).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED', message });
  },
);

it.each([
  { sessionId: 'session-1' },
  { sessionId: 'session-1', title: 42 },
  { sessionId: 'session-1', title: 'New title', titleSource: 'manual' },
])(
  'rejects a malformed rename input before its handler: %j',
  async (input): Promise<void> => {
    const { caller } = await startAcpEngine({ steps: [] });
    await expect(
      Reflect.apply(caller.session.rename, undefined, [input]),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  },
);
