import type { Subagent } from '@repo/contracts';
import { session, turn } from '@repo/db/schema';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { eq, inArray } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import {
  openAcpFeedSession,
  parentSubagentUpdates,
  waitForAcpSessionIdle,
} from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const missingChild = 'No Subagent was persisted';

// The background parent closes and resumes; its new Turn reports the stored child idle.
type ResumedParent = Awaited<ReturnType<typeof openAcpFeedSession>> & {
  child: Subagent;
};

async function resumeBackgroundParent(): Promise<ResumedParent> {
  const background = scenarios['subagent-background'];

  const { host, sessionId } = await openAcpFeedSession({
    ...background,
    responses: {
      'session/prompt': [
        { steps: background.steps },
        {
          steps: [
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
        },
      ],
    },
  });

  const [child] = await host.caller.session.subagents({ sessionId });

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

  expect(await host.caller.session.subagents({ sessionId })).toMatchObject([
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

    const [child] = await host.caller.session.subagents({ sessionId });

    if (!child) throw new Error(missingChild);
    const stream = await host.caller.feed.subscribe({ sessionId, after: null });
    const iterator = stream[Symbol.asyncIterator]();
    await iterator.next();
    await requireScriptedProcessAt(host.agent.processes).play(
      [{ type: 'exit', code: 17, stderr: 'Background work interrupted' }],
      'owned-1',
    );
    let next = await iterator.next();

    while (next.value?.type !== 'closed') next = await iterator.next();
    await iterator.return?.();
    await vi.waitFor(async () =>
      expect(await host.caller.session.subagents({ sessionId })).toMatchObject([
        { state: 'idle', stopReason: 'error' },
      ]),
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
    expect(await host.caller.session.subagents({ sessionId })).toHaveLength(1),
  );
  const [child] = await host.caller.session.subagents({ sessionId });

  if (!child) throw new Error(missingChild);
  await vi.waitFor(async () =>
    expect(
      await host.caller.session.subagents({ sessionId: child.sessionId }),
    ).toHaveLength(1),
  );

  const [nested] = await host.caller.session.subagents({
    sessionId: child.sessionId,
  });

  if (!nested) throw new Error(missingChild);
  await host.caller.session.close({ sessionId });
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
