import type { FeedSubscribeOutput } from '@repo/contracts';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it, onTestFinished } from 'vitest';
import { startAcpEngine, emptySessionInput } from '#mocks/acp-engine';
import {
  openAcpFeedSession,
  waitForAcpSessionIdle,
  waitForAcpSnapshot,
} from '#mocks/acp-feed';
import { startEngineTestHost } from '#mocks/engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const backgroundScenario = 'subagent-background';

const missingSubagent = 'No Subagent was persisted';

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
