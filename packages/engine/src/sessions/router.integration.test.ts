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

type SessionCaller = Awaited<ReturnType<typeof startAcpEngine>>['caller'];

const shellUnavailable = 'Shell runtime is not implemented yet';

it.each([
  {
    procedure: 'shells',
    call: async (caller: SessionCaller): Promise<void> => {
      await caller.session.shells({ sessionId: 'session-1' });
    },
    message: shellUnavailable,
  },
  {
    procedure: 'stopShell',
    call: async (caller: SessionCaller): Promise<void> => {
      await caller.session.stopShell({
        sessionId: 'session-1',
        shellId: 'terminal-1',
      });
    },
    message: shellUnavailable,
  },
  {
    procedure: 'shell.output',
    call: async (caller: SessionCaller): Promise<void> => {
      await caller.shell.output({
        sessionId: 'session-1',
        shellId: 'terminal-1',
        after: 0,
      });
    },
    message: shellUnavailable,
  },
  {
    procedure: 'rename',
    call: async (caller: SessionCaller): Promise<void> => {
      await caller.session.rename({
        sessionId: 'session-1',
        title: 'New title',
      });
    },
    message: 'Session rename is not implemented yet',
  },
  {
    procedure: 'answerPlanProposal',
    call: async (caller: SessionCaller): Promise<void> => {
      await caller.session.answerPlanProposal({
        sessionId: 'session-1',
        planId: 'plan',
        decision: 'approve',
      });
    },
    message: 'Plan proposal answers are not implemented yet',
  },
  {
    procedure: 'changes',
    call: async (caller: SessionCaller): Promise<void> => {
      await caller.session.changes({ sessionId: 'session-1' });
    },
    message: 'This procedure is not implemented yet',
  },
  {
    procedure: 'diff',
    call: async (caller: SessionCaller): Promise<void> => {
      await caller.session.diff({ sessionId: 'session-1', path: 'file.ts' });
    },
    message: 'This procedure is not implemented yet',
  },
])(
  'preserves the unimplemented $procedure error',
  async ({ call, message }): Promise<void> => {
    const { caller } = await startAcpEngine({ steps: [] });
    await expect(call(caller)).rejects.toMatchObject({
      code: 'NOT_IMPLEMENTED',
      message,
    });
  },
);

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
