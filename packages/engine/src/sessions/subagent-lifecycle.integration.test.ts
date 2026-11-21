import type { FeedSubscribeOutput, Subagent } from '@repo/contracts';
import { turn, session } from '@repo/db/schema';
import { smallModelUpdate } from '@repo/mocks/agent/acp-configuration';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { subagentSessionId } from '@repo/mocks/agent/subagent-scenarios';
import { eq, inArray } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import {
  openAcpFeedSession,
  parentSubagentUpdates,
  waitForAcpSessionIdle,
} from '#mocks/acp-feed';
import { closeTestSession } from '#mocks/close-session';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { onTranscript } from '#mocks/subagent-steps';

const missingChild = 'No Subagent was persisted';

async function waitForClosed(
  iterator: AsyncIterator<FeedSubscribeOutput>,
): Promise<void> {
  let next = await iterator.next();

  while (next.value?.type !== 'closed') next = await iterator.next();
}

async function closeIterator(
  iterator: AsyncIterator<FeedSubscribeOutput>,
): Promise<void> {
  await iterator.return?.();
}

type ResumedParent = Awaited<ReturnType<typeof openAcpFeedSession>> & {
  child: Subagent;
};

async function resumeBackgroundParent(): Promise<ResumedParent> {
  const background = scenarios['subagent-background'];

  const { host, sessionId } = await openAcpFeedSession({
    ...background,
    steps: [
      ...background.steps,
      onTranscript(smallModelUpdate, subagentSessionId),
    ],
    resumedSteps: [
      {
        type: 'update',
        update: {
          sessionUpdate: 'subagent_update',
          sessionId: subagentSessionId,
          state: {
            state: 'idle',
            stopReason: 'end_turn',
            usage: { totalTokens: 12, inputTokens: 8, outputTokens: 4 },
          },
        },
      },
    ],
  });

  const [child] = await host.caller.session.listAgents({ sessionId });

  if (!child) throw new Error(missingChild);
  await closeTestSession(host, { sessionId });
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Resume' }],
  });
  await waitForAcpSessionIdle(host, sessionId);

  return { host, sessionId, child };
}

it('finishes the original child Turn when its resumed parent receives an idle outcome', async () => {
  const { host, sessionId, child } = await resumeBackgroundParent();

  expect(child).toMatchObject({ state: 'running', model: 'small' });
  expect(await host.caller.session.listAgents({ sessionId })).toMatchObject([
    {
      state: 'idle',
      stopReason: 'end_turn',
      model: 'small',
      tokens: 12,
      endedAt: expect.any(Number),
    },
  ]);

  const turns = host.database
    .select()
    .from(turn)
    .where(eq(turn.sessionId, child.sessionId))
    .all();

  expect(turns).toHaveLength(1);
  expect(turns[0]).toMatchObject({
    status: 'ended',
    startedAt: child.startedAt,
  });

  const page = await host.caller.feed.page({
    sessionId: child.sessionId,
    direction: 'tail',
  });

  expect(page.rows.every((row) => row.state === 'settled')).toBe(true);
});

it('records no new spawn when a resumed parent reports its stored child', async () => {
  const { host, sessionId } = await resumeBackgroundParent();

  expect(
    (await parentSubagentUpdates(host, sessionId)).map(
      (row) => row._meta?.argo?.action,
    ),
  ).toEqual(['spawn', 'message', undefined]);
});

it.each(appFixtureAgentIds)(
  'settles running Subagent work when the %s Agent exits',
  async (agentId) => {
    const { host, sessionId } = await openAcpFeedSession(
      scenarios['subagent-background'],
      agentId,
    );

    const [child] = await host.caller.session.listAgents({ sessionId });

    if (!child) throw new Error(missingChild);
    const stream = await host.caller.feed.subscribe({ sessionId, after: null });
    const iterator = stream[Symbol.asyncIterator]();
    await iterator.next();
    await requireScriptedProcessAt(host.agent.processes).play(
      [{ type: 'exit', code: 17, stderr: 'Background work interrupted' }],
      'owned-1',
    );
    await waitForClosed(iterator);
    await closeIterator(iterator);
    await vi.waitFor(async () =>
      expect(await host.caller.session.listAgents({ sessionId })).toMatchObject(
        [{ state: 'idle', stopReason: 'error' }],
      ),
    );

    const turns = host.database
      .select()
      .from(turn)
      .where(eq(turn.sessionId, child.sessionId))
      .all();

    expect(turns[0]).toMatchObject({
      status: 'ended',
      stopReason: 'error',
      error: { code: 'interrupted' },
    });

    const page = await host.caller.feed.page({
      sessionId: child.sessionId,
      direction: 'tail',
    });

    expect(page.rows.every((row) => row.state === 'settled')).toBe(true);
    expect(page.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionUpdate: 'notice',
          title: 'Agent exited with status 17',
          description: 'Background work interrupted',
        }),
      ]),
    );
  },
);

it('discards an Empty Session with all its Subagents instead of promoting them to root Sessions', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await host.caller.session.new(emptySessionInput);
  await requireScriptedProcessAt(host.agent.processes).play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'subagent_update',
          sessionId: 'child',
          state: { state: 'running' },
        },
      },
      {
        type: 'update',
        sessionId: 'child',
        update: {
          sessionUpdate: 'subagent_update',
          sessionId: 'nested',
          state: { state: 'running' },
        },
      },
    ],
    'owned-1',
  );
  await vi.waitFor(async () =>
    expect(await host.caller.session.listAgents({ sessionId })).toHaveLength(1),
  );
  const [child] = await host.caller.session.listAgents({ sessionId });

  if (!child) throw new Error(missingChild);
  await vi.waitFor(async () =>
    expect(
      await host.caller.session.listAgents({ sessionId: child.sessionId }),
    ).toHaveLength(1),
  );

  const [nested] = await host.caller.session.listAgents({
    sessionId: child.sessionId,
  });

  if (!nested) throw new Error(missingChild);
  await closeTestSession(host, { sessionId });
  expect(
    host.database
      .select()
      .from(session)
      .where(
        inArray(session.id, [sessionId, child.sessionId, nested.sessionId]),
      )
      .all(),
  ).toEqual([]);
  expect(await host.caller.session.list({ archived: false })).toMatchObject({
    sessions: [],
  });
  await expect(
    host.caller.session.prompt({
      sessionId: child.sessionId,
      prompt: [{ type: 'text', text: 'Read-only' }],
    }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
