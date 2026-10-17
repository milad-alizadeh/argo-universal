import { session, turn } from '@repo/db/schema';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { scenarios } from '@repo/mocks/agent/scenarios';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { eq } from 'drizzle-orm';
import { expect, it, vi, onTestFinished } from 'vitest';
import { startAcpEngine, emptySessionInput } from '#mocks/acp-engine';
import {
  openAcpFeedSession,
  parentSubagentUpdates,
  waitForAcpSessionIdle,
  waitForAcpSnapshot,
} from '#mocks/acp-feed';
import { startEngineTestHost } from '#mocks/engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const backgroundScenario = 'subagent-background';

const missingSubagent = 'No Subagent was persisted';

it.each(
  appFixtureAgentIds.flatMap((agentId) => [
    { agentId, scenario: 'subagent-foreground' as const, prompts: 1, turns: 1 },
    { agentId, scenario: backgroundScenario, prompts: 1, turns: 1 } as const,
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

    if (!child) throw new Error(missingSubagent);
    expect(child).toMatchObject({
      parentSessionId: sessionId,
      title: 'Review the change',
      state: scenario === backgroundScenario ? 'running' : 'idle',
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

  if (!child) throw new Error(missingSubagent);
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

// The parent revises its delegation by patch and chunk, then the child ends its Turn.
const revisedDelegation: ScriptedScenario = {
  sessionIds: ['parent'],
  steps: [
    {
      type: 'update',
      update: {
        sessionUpdate: 'session_message',
        messageId: 'unrelated',
        recipientSessionId: 'unassociated',
        content: [{ type: 'text', text: 'No parentage' }],
      },
    },
    {
      type: 'update',
      update: {
        sessionUpdate: 'subagent_update',
        sessionId: 'review',
        state: { state: 'running' },
      },
    },
    {
      type: 'update',
      update: {
        sessionUpdate: 'session_message',
        messageId: 'delegation',
        senderSessionId: 'parent',
        recipientSessionId: 'review',
        content: [{ type: 'text', text: 'Original' }],
      },
    },
    {
      type: 'update',
      update: {
        sessionUpdate: 'session_message',
        messageId: 'delegation',
        content: [{ type: 'text', text: 'Revised' }],
      },
    },
    {
      type: 'update',
      update: {
        sessionUpdate: 'session_message',
        messageId: 'delegation',
        recipientSessionId: 'review',
      },
    },
    {
      type: 'update',
      update: {
        sessionUpdate: 'session_message_chunk',
        messageId: 'delegation',
        content: { type: 'text', text: ' instruction' },
      },
    },
    {
      type: 'update',
      sessionId: 'review',
      update: {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: 'Done' },
      },
    },
    {
      type: 'update',
      update: {
        sessionUpdate: 'subagent_update',
        sessionId: 'review',
        state: {
          state: 'idle',
          stopReason: 'end_turn',
          usage: {
            totalTokens: 12,
            inputTokens: 8,
            outputTokens: 4,
            thoughtTokens: null,
          },
        },
      },
    },
  ],
};

it.each([
  { claim: 'its patches and chunks', scenario: revisedDelegation },
  {
    claim: 'the Agent reports no incoming view',
    scenario: scenarios['subagent-outgoing-only'],
  },
])(
  "keeps the parent's outgoing message out of the child Feed when $claim",
  async ({ scenario }) => {
    const { host, sessionId } = await openAcpFeedSession(scenario);

    const [child] = await host.caller.session.subagents({ sessionId });

    if (!child) throw new Error(missingSubagent);

    const page = await host.caller.feed.page({
      sessionId: child.sessionId,
      direction: 'tail',
    });

    expect(page.rows.map((row) => row.sessionUpdate)).toEqual([
      'agent_message',
    ]);
  },
);

it("revises one parent prompt from patches and chunks of the parent's outgoing message", async () => {
  const { host, sessionId } = await openAcpFeedSession(revisedDelegation);

  expect(
    (await parentSubagentUpdates(host, sessionId)).flatMap((row) =>
      row._meta?.argo?.action === 'message' ? [row._meta.argo.prompt] : [],
    ),
  ).toEqual([
    [
      { type: 'text', text: 'Revised' },
      { type: 'text', text: ' instruction' },
    ],
  ]);
});

it.each(['idle', 'cancelled'] as const)(
  'streams new child content while the parent Turn is %s',
  async (phase) => {
    const { host, sessionId } = await backgroundParent(phase);

    const [child] = await host.caller.session.subagents({ sessionId });

    if (!child) throw new Error(missingSubagent);

    const stream = await host.caller.feed.subscribe({
      sessionId: child.sessionId,
      after: null,
    });

    const iterator = stream[Symbol.asyncIterator]();
    let initial = await iterator.next();

    while (initial.value?.type !== 'snapshot') initial = await iterator.next();
    await requireScriptedProcessAt(host.agent.processes).play(
      [
        {
          type: 'update',
          sessionId: 'subagent-review',
          update: {
            sessionUpdate: 'agent_message_chunk',
            messageId: 'later',
            content: { type: 'text', text: 'Still reviewing' },
          },
        },
      ],
      'unused',
    );

    let next = await iterator.next();

    while (
      next.value?.type !== 'row.upsert' ||
      next.value.row.sessionUpdate !== 'agent_message' ||
      next.value.row.messageId !== 'later'
    )
      next = await iterator.next();
    expect(next.value.row.content).toEqual([
      { type: 'text', text: 'Still reviewing' },
    ]);
    await iterator.return?.();
  },
);

async function backgroundParent(
  phase: 'idle' | 'cancelled',
): Promise<Awaited<ReturnType<typeof openAcpFeedSession>>> {
  const gate = Promise.withResolvers<void>();
  onTestFinished(() => gate.resolve());

  const host = await startAcpEngine({
    ...scenarios[backgroundScenario],
    responses: {
      'session/prompt': [
        { steps: scenarios[backgroundScenario].steps, waitFor: gate.promise },
      ],
    },
  });

  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Start background work' }],
  });

  await waitForAcpSnapshot(
    host,
    sessionId,
    (snapshot) => snapshot.subagents.length === 1,
  );

  if (phase === 'cancelled') await host.caller.session.cancel({ sessionId });
  else gate.resolve();
  await waitForAcpSessionIdle(host, sessionId);

  return { host, sessionId };
}
