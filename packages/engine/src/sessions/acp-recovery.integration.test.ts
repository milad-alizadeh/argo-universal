import type {
  PromptRequest,
  ResumeSessionRequest,
} from '@agentclientprotocol/sdk';
import { acpPermission } from '@repo/mocks/agent/permission-scenario';
import { expect, it, vi } from 'vitest';
import { waitFor } from 'xstate';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { findMachineActor } from '../lib/machine-actor';
import type { SessionActorRef } from './index';
import { sessionMachine } from './session-machine';
import { sessionActorId } from './session-system';

type AcpHost = Awaited<ReturnType<typeof startAcpEngine>>;
const recoveryTimeout = { timeout: 10_000 };
const requireSession = (host: AcpHost, sessionId: string): SessionActorRef => {
  const session = findMachineActor(
    host.engine.system,
    sessionActorId(sessionId),
    sessionMachine,
  );
  if (!session) throw new Error(`Session ${sessionId} is not open`);
  return session;
};
const waitForGeneration = async (
  host: AcpHost,
  sessionId: string,
  generation: number,
): Promise<void> => {
  await waitFor(
    requireSession(host, sessionId),
    (snapshot) =>
      host.agent.processes.length === generation &&
      snapshot.matches({ open: { acp: 'idle' } }),
    recoveryTimeout,
  );
};
const readTurn = (host: AcpHost, sessionId: string): unknown =>
  host.database.$client
    .prepare(
      'SELECT stop_reason AS stopReason, error FROM turn WHERE session_id = ?',
    )
    .get(sessionId);
const pageRows = async (
  host: AcpHost,
  sessionId: string,
): Promise<Awaited<ReturnType<AcpHost['caller']['feed']['page']>>['rows']> =>
  (await host.caller.feed.page({ sessionId, direction: 'tail' })).rows;

type Recorded = {
  prompts: PromptRequest[];
  resumes: ResumeSessionRequest[];
};
// Breaks the connection while a Turn waits on its prompt, then waits for recovery.
const interruptTurn = async (): Promise<
  Recorded & { host: AcpHost; sessionId: string }
> => {
  const recorded: Recorded = { prompts: [], resumes: [] };
  const host = await startAcpEngine({
    steps: [{ type: 'hold' }],
    responses: {
      'session/prompt': [
        { requests: recorded.prompts, steps: [{ type: 'hold' }] },
      ],
      'session/resume': [{ requests: recorded.resumes }],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Work' }],
  });
  await expect.poll(() => recorded.prompts).toHaveLength(1);
  requireScriptedProcessAt(host.agent.processes).disconnect();
  await waitForGeneration(host, created.sessionId, 2);
  return { ...recorded, host, sessionId: created.sessionId };
};

it(
  'a connection failure during a Turn records the Turn as interrupted',
  recoveryTimeout,
  async () => {
    const { host, sessionId } = await interruptTurn();
    expect(readTurn(host, sessionId)).toEqual({
      stopReason: 'error',
      error: expect.stringContaining('interrupted'),
    });
  },
);

it(
  'an interrupted Turn is resumed without resending its prompt',
  recoveryTimeout,
  async () => {
    const { prompts, resumes } = await interruptTurn();
    expect({
      prompts: prompts.length,
      resumed: resumes.map((resume) => resume.sessionId),
    }).toEqual({ prompts: 1, resumed: [prompts[0]?.sessionId] });
  },
);

it(
  'an interrupted Turn discloses that its output may be missing',
  recoveryTimeout,
  async () => {
    const { host, sessionId } = await interruptTurn();
    expect(await pageRows(host, sessionId)).toContainEqual(
      expect.objectContaining({
        sessionUpdate: 'notice',
        description: expect.stringContaining('may be missing'),
      }),
    );
  },
);

it(
  'Sessions sharing a failed connection recover through one replacement',
  recoveryTimeout,
  async () => {
    const host = await startAcpEngine();
    const first = await host.caller.session.new(emptySessionInput);
    const second = await host.caller.session.new(emptySessionInput);
    requireScriptedProcessAt(host.agent.processes).disconnect();
    await waitForGeneration(host, first.sessionId, 2);
    await waitForGeneration(host, second.sessionId, 2);
    expect(host.agent.processes).toHaveLength(2);
  },
);

it(
  'a failed resume on the replacement retries within the crash budget',
  recoveryTimeout,
  async () => {
    const resumes: ResumeSessionRequest[] = [];
    const host = await startAcpEngine({
      steps: [],
      responses: {
        'session/resume': [
          { requests: resumes, error: 'Resume failed' },
          { requests: resumes },
        ],
      },
    });
    const created = await host.caller.session.new(emptySessionInput);
    requireScriptedProcessAt(host.agent.processes).disconnect();
    await waitFor(
      requireSession(host, created.sessionId),
      (snapshot) =>
        resumes.length === 2 && snapshot.matches({ open: { acp: 'idle' } }),
      recoveryTimeout,
    );
    expect(
      requireSession(host, created.sessionId).getSnapshot().context,
    ).toMatchObject({ failure: null });
  },
);

it(
  'a recovered Session accepts its next prompt on the replacement connection',
  recoveryTimeout,
  async () => {
    const host = await startAcpEngine();
    const created = await host.caller.session.new(emptySessionInput);
    requireScriptedProcessAt(host.agent.processes).disconnect();
    await waitForGeneration(host, created.sessionId, 2);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Again' }],
    });
    await waitForAcpSessionIdle(host, created.sessionId);
    expect(readTurn(host, created.sessionId)).toMatchObject({
      stopReason: 'end_turn',
    });
  },
);

it(
  'an old process that does not exit fails recovery with a concrete outcome',
  recoveryTimeout,
  async () => {
    const host = await startAcpEngine({
      steps: [],
      autoExit: false,
      releaseTimeoutMs: 50,
    });
    const created = await host.caller.session.new(emptySessionInput);
    const session = requireSession(host, created.sessionId);
    requireScriptedProcessAt(host.agent.processes).disconnect();
    const replacement = await vi.waitFor(
      () => requireScriptedProcessAt(host.agent.processes, 1),
      recoveryTimeout,
    );
    await vi.waitFor(() => expect(replacement.terminations).toBe(1));
    replacement.exited.resolve();
    const failed = await waitFor(
      session,
      (snapshot) => snapshot.context.failure?.includes('did not exit') === true,
      recoveryTimeout,
    );
    expect(failed.context.failure).toContain('recovery is blocked');
  },
);

it(
  'repeated connection failures stop recovery within the existing crash budget',
  recoveryTimeout,
  async () => {
    const host = await startAcpEngine();
    const created = await host.caller.session.new(emptySessionInput);
    const session = requireSession(host, created.sessionId);
    for (const generation of [1, 2]) {
      requireScriptedProcessAt(
        host.agent.processes,
        generation - 1,
      ).disconnect();
      await waitForGeneration(host, created.sessionId, generation + 1);
    }
    requireScriptedProcessAt(host.agent.processes, 2).disconnect();
    const stopped = await waitFor(
      session,
      (snapshot) => snapshot.context.failure !== null,
      recoveryTimeout,
    );
    expect({
      failure: stopped.context.failure,
      processes: host.agent.processes.length,
    }).toEqual({
      failure: 'The Agent stopped three times in ten minutes',
      processes: 3,
    });
  },
);

it('a reopened Session resumes its Agent context without appending replayed history', async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/resume': [
        {
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'Replayed history' },
              },
            },
          ],
        },
      ],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.close(created);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Continue' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  expect(JSON.stringify(await pageRows(host, created.sessionId))).not.toContain(
    'Replayed history',
  );
});

it(
  'an answer to a question from the failed connection cannot reach the replacement',
  recoveryTimeout,
  async (): Promise<void> => {
    const host = await startAcpEngine({
      steps: [
        {
          type: 'permission',
          request: {
            toolCall: acpPermission.toolCall,
            options: acpPermission.options,
          },
        },
        { type: 'hold' },
      ],
    });
    const created = await host.caller.session.new(emptySessionInput);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Read' }],
    });
    const pending = await waitForAcpSnapshot(
      host,
      created.sessionId,
      (snapshot) => snapshot.pendingPermission !== null,
    );
    const requestId = pending.pendingPermission?.requestId;
    if (requestId === undefined) throw new Error('No pending permission');
    requireScriptedProcessAt(host.agent.processes).disconnect();
    await waitForGeneration(host, created.sessionId, 2);
    await expect(
      host.caller.session.answerPermission({
        ...created,
        requestId,
        optionId: 'read-once',
      }),
    ).rejects.toThrow('already answered');
  },
);

it('reopening after an interrupted Turn discloses missing output once', async () => {
  const host = await startAcpEngine();
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.close(created);
  host.database.$client
    .prepare(
      `INSERT INTO turn (id, session_id, status, stop_reason, error, started_at, ended_at)
       VALUES ('stopped-turn', ?, 'ended', 'error', ?, 1, 2)`,
    )
    .run(
      created.sessionId,
      JSON.stringify({
        code: 'interrupted',
        message: 'The Server stopped during the Turn',
      }),
    );
  for (const text of ['Continue', 'Again']) {
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text }],
    });
    await waitForAcpSessionIdle(host, created.sessionId);
    await host.caller.session.close(created);
  }
  expect(
    (await pageRows(host, created.sessionId)).filter(
      (row) => row.id === 'stopped-turn:interrupted',
    ),
  ).toEqual([
    expect.objectContaining({
      turnId: 'stopped-turn',
      title: 'Output may be missing',
    }),
  ]);
});
