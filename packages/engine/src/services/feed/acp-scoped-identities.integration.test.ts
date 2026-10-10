import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, type AcpFeedUpdates } from '#mocks/acp-feed';

const updates: AcpFeedUpdates = [
  {
    sessionUpdate: 'agent_message_chunk',
    messageId: 'shared',
    content: { type: 'text', text: 'Answer' },
  },
  {
    sessionUpdate: 'tool_call',
    toolCallId: 'shared',
    title: 'Read',
    status: 'completed',
  },
  {
    sessionUpdate: 'plan_update',
    plan: { type: 'items', planId: 'shared', entries: [] },
  },
  {
    sessionUpdate: 'compaction_update',
    compactionId: 'shared',
    status: 'completed',
  },
];
it.each(['agent-1', 'agent-2'])(
  '%s scopes equal upstream identities by actual ACP Session and entity kind',
  async (agent) => {
    const host = await startAcpEngine(feedScenario(updates), undefined, agent);
    const first = await host.caller.session.new({
      ...emptySessionInput,
      agent,
      prompt: [{ type: 'text', text: 'First' }],
    });
    const second = await host.caller.session.new({
      ...emptySessionInput,
      agent,
      prompt: [{ type: 'text', text: 'Second' }],
    });
    await waitForAcpSessionIdle(host, first.sessionId);
    await waitForAcpSessionIdle(host, second.sessionId);
    const pages = await Promise.all(
      [first, second].map((session) =>
        host.caller.feed.page({ ...session, direction: 'tail' }),
      ),
    );
    expect(host.agent.processes).toHaveLength(1);
    expect(
      pages.map((page) => page.rows.map((row) => row.sessionUpdate)),
    ).toEqual(
      Array.from({ length: 2 }, () => [
        'user_message',
        'agent_message',
        'tool_call_update',
        'plan_update',
        'compaction_update',
      ]),
    );
    expect(
      new Set(pages.flatMap((page) => page.rows.map((row) => row.id))).size,
    ).toBe(10);
    expect(
      pages[0]?.rows.every((row) => row.sessionId === first.sessionId),
    ).toBe(true);
    expect(
      pages[1]?.rows.every((row) => row.sessionId === second.sessionId),
    ).toBe(true);
  },
);
