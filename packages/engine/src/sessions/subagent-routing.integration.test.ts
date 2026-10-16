import { session, turn } from '@repo/db/schema';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { eq } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import { openAcpFeedSession, waitForAcpSessionIdle } from '#mocks/acp-feed';
import { startEngineTestHost } from '#mocks/engine';

it.each(
  appFixtureAgentIds.flatMap((agentId) => [
    { agentId, scenario: 'subagent-foreground' as const, prompts: 1, turns: 1 },
    { agentId, scenario: 'subagent-background' as const, prompts: 1, turns: 1 },
    { agentId, scenario: 'subagent-more-work' as const, prompts: 2, turns: 2 },
  ]),
)(
  'persists $scenario for $agentId in its own read-only Feed',
  async ({ agentId, scenario, prompts, turns }) => {
    const { host, sessionId } = await openAcpFeedSession(
      scenarios[scenario],
      agentId,
    );

    for (let index = 1; index < prompts; index++) {
      await host.caller.session.prompt({
        sessionId,
        prompt: [{ type: 'text', text: 'More work' }],
      });
      await waitForAcpSessionIdle(host, sessionId);
    }

    const children = await host.caller.session.subagents({ sessionId });
    expect(children).toHaveLength(1);
    const list = await host.caller.session.list({ archived: false });
    expect(list.sessions.map((row) => row.sessionId)).toEqual([sessionId]);
    const child = children[0];

    if (!child) throw new Error('No Subagent was persisted');
    expect(child).toMatchObject({
      parentSessionId: sessionId,
      title: 'Review the change',
      state: scenario === 'subagent-background' ? 'running' : 'idle',
    });

    const stored = host.database
      .select()
      .from(session)
      .where(eq(session.id, child.sessionId))
      .get();

    const parent = host.database
      .select()
      .from(session)
      .where(eq(session.id, sessionId))
      .get();

    expect(stored).toMatchObject({
      parentSessionId: sessionId,
      vendorSessionId: 'subagent-review',
      agent: agentId,
      checkoutPath: parent?.checkoutPath,
    });
    expect(
      host.database
        .select()
        .from(turn)
        .where(eq(turn.sessionId, child.sessionId))
        .all(),
    ).toHaveLength(turns);
    await expectLiveChildMessage(host, child.sessionId);
    await host.caller.session.close({ sessionId });
    await vi.waitFor(async () => {
      const saved = await host.caller.feed.page({
        sessionId: child.sessionId,
        direction: 'tail',
      });

      expect(
        saved.rows.some((row) => row.sessionUpdate === 'agent_message'),
      ).toBe(true);
    });

    const page = await host.caller.feed.page({
      sessionId: child.sessionId,
      direction: 'tail',
    });

    expect(page.rows[0]).toMatchObject({
      sessionUpdate: 'session_message',
      _meta: { argo: { senderSessionId: sessionId } },
    });
    expect(page.rows.some((row) => row.sessionUpdate === 'agent_message')).toBe(
      true,
    );

    const parentPage = await host.caller.feed.page({
      sessionId,
      direction: 'tail',
    });

    expect(
      parentPage.rows.filter((row) => row.sessionUpdate === 'subagent_update'),
    ).not.toHaveLength(0);
    expect(
      parentPage.rows.some((row) => row.sessionUpdate === 'session_message'),
    ).toBe(false);
  },
  15_000,
);

async function expectLiveChildMessage(
  host: Awaited<ReturnType<typeof openAcpFeedSession>>['host'],
  sessionId: string,
): Promise<void> {
  const stream = await host.caller.feed.subscribe({
    sessionId,
    after: { epoch: 0, revision: 0 },
  });

  for await (const event of stream)
    if (
      event.type === 'row.upsert' &&
      event.row.sessionUpdate === 'agent_message'
    )
      return;

  throw new Error('No live Subagent message');
}

it('reads the stored Subagent Feed after restart without launching an Agent', async () => {
  const { host, sessionId } = await openAcpFeedSession(
    scenarios['subagent-foreground'],
  );

  const [child] = await host.caller.session.subagents({ sessionId });

  if (!child) throw new Error('No Subagent was persisted');
  await host.stop();

  const restarted = await startEngineTestHost({
    home: host.home,
    acp: host.agent,
  });

  const saved = await restarted.caller.feed.page({
    sessionId: child.sessionId,
    direction: 'tail',
  });

  expect(saved.rows.map((row) => row.sessionUpdate)).toEqual([
    'session_message',
    'agent_message',
  ]);
  expect(host.agent.processes).toHaveLength(1);
  expect(await restarted.caller.session.subagents({ sessionId })).toMatchObject(
    [{ sessionId: child.sessionId, state: 'idle' }],
  );
});
