import type { FeedSubscribeOutput } from '@repo/contracts';
import { session, turn } from '@repo/db/schema';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { eq } from 'drizzle-orm';
import { expect, it, vi, onTestFinished } from 'vitest';
import { startAcpEngine, emptySessionInput } from '#mocks/acp-engine';
import {
  openAcpFeedSession,
  waitForAcpSessionIdle,
  waitForAcpSnapshot,
} from '#mocks/acp-feed';
import { closeTestSession } from '#mocks/close-session';
import { startEngineTestHost } from '#mocks/engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const backgroundScenario = 'subagent-background';

const missingSubagent = 'No Subagent was persisted';

function isAgentMessage(event: FeedSubscribeOutput): boolean {
  return (
    event.type === 'row.upsert' && event.row.sessionUpdate === 'agent_message'
  );
}

function requireValue<T>(value: T | undefined): T {
  if (!value) throw new Error(missingSubagent);

  return value;
}

function childState(scenario: string): string {
  return scenario === backgroundScenario ? 'running' : 'idle';
}

async function expectLiveChildMessage(
  host: Awaited<ReturnType<typeof openAcpFeedSession>>['host'],
  sessionId: string,
): Promise<void> {
  const stream = await host.caller.feed.subscribe({
    sessionId,
    after: { epoch: 0, revision: 0 },
  });

  for await (const event of stream) if (isAgentMessage(event)) return;

  throw new Error('No live Subagent message');
}

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

    const children = await host.caller.session.listAgents({ sessionId });
    expect(children).toHaveLength(1);
    const list = await host.caller.session.list({ archived: false });
    expect(list.sessions.map((row) => row.sessionId)).toEqual([sessionId]);
    const child = requireValue(children[0]);
    expect(child).toMatchObject({
      parentSessionId: sessionId,
      title: 'Review the change',
      state: childState(scenario),
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
    await closeTestSession(host, { sessionId });
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

type RowUpdate = Extract<FeedSubscribeOutput, { type: 'row.upsert' }>;

type AgentMessageUpdate = RowUpdate & {
  row: Extract<RowUpdate['row'], { sessionUpdate: 'agent_message' }>;
};

function isLaterRow(event: RowUpdate): boolean {
  return (
    event.row.sessionUpdate === 'agent_message' &&
    event.row.messageId === 'later'
  );
}

function isLaterMessage(
  event: FeedSubscribeOutput | undefined,
): event is AgentMessageUpdate {
  return event?.type === 'row.upsert' && isLaterRow(event);
}

async function waitForSnapshot(
  iterator: AsyncIterator<FeedSubscribeOutput>,
): Promise<void> {
  let initial = await iterator.next();

  while (initial.value?.type !== 'snapshot') initial = await iterator.next();
}

async function waitForLaterMessage(
  iterator: AsyncIterator<FeedSubscribeOutput>,
): Promise<AgentMessageUpdate> {
  let next = await iterator.next();

  while (!isLaterMessage(next.value)) next = await iterator.next();

  return next.value;
}

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

// The restart budget includes ACP's five-second close deadline and two Engine starts.
it('reads the stored Subagent Feed after restart without launching an Agent', async () => {
  const { host, sessionId } = await openAcpFeedSession(
    scenarios['subagent-foreground'],
  );

  const [child] = await host.caller.session.listAgents({ sessionId });

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
  expect(
    await restarted.caller.session.listAgents({ sessionId }),
  ).toMatchObject([{ sessionId: child.sessionId, state: 'idle' }]);
}, 15_000);

it.each(['idle', 'cancelled'] as const)(
  'streams new child content while the parent Turn is %s',
  async (phase) => {
    const { host, sessionId } = await backgroundParent(phase);

    const [child] = await host.caller.session.listAgents({ sessionId });

    if (!child) throw new Error(missingSubagent);

    const stream = await host.caller.feed.subscribe({
      sessionId: child.sessionId,
      after: null,
    });

    const iterator = stream[Symbol.asyncIterator]();
    await waitForSnapshot(iterator);
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

    const next = await waitForLaterMessage(iterator);
    expect(next.row.content).toEqual([
      { type: 'text', text: 'Still reviewing' },
    ]);
    await iterator.return?.();
  },
);
