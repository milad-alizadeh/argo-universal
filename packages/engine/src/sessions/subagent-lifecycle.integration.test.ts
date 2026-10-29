import type { FeedSubscribeOutput, Subagent } from '@repo/contracts';
import { turn } from '@repo/db/schema';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { eq } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import {
  openAcpFeedSession,
  parentSubagentUpdates,
  waitForAcpSessionIdle,
} from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

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
    resumedSteps: [
      {
        type: 'update',
        update: {
          sessionUpdate: 'subagent_update',
          sessionId: 'subagent-review',
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
  await host.caller.session.close({ sessionId });
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Resume' }],
  });
  await waitForAcpSessionIdle(host, sessionId);

  return { host, sessionId, child };
}

it('finishes the original child Turn when its resumed parent receives an idle outcome', async () => {
  const { host, sessionId, child } = await resumeBackgroundParent();

  expect(await host.caller.session.listAgents({ sessionId })).toMatchObject([
    {
      state: 'idle',
      stopReason: 'end_turn',
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
