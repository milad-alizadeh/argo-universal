import type { FeedSubscribeOutput } from '@repo/contracts';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

function isIdleSnapshot(update: FeedSubscribeOutput): boolean {
  return update.type === 'snapshot' && update.snapshot.activeTurnId === null;
}

async function nextUpdate(
  feed: AsyncIterator<FeedSubscribeOutput>,
): Promise<FeedSubscribeOutput> {
  const next = await feed.next();

  if (next.done) throw new Error('Session closed before completion');

  return next.value;
}

async function collectUntilIdle(
  feed: AsyncIterator<FeedSubscribeOutput>,
): Promise<FeedSubscribeOutput[]> {
  const updates: FeedSubscribeOutput[] = [];

  while (true) {
    const update = await nextUpdate(feed);
    updates.push(update);

    if (isIdleSnapshot(update)) break;
  }

  return updates;
}

describe.each(appFixtureAgentIds)('%s ACP lifecycle', (agentId) => {
  const sessionInput = { ...emptySessionInput, agent: agentId };
  it('wire-earlier chunks are visible before completion publishes idle', async () => {
    const host = await startAcpEngine(
      {
        steps: [
          {
            type: 'update',
            update: {
              sessionUpdate: 'agent_message_chunk',
              content: { type: 'text', text: 'First ' },
            },
          },
          {
            type: 'update',
            update: {
              sessionUpdate: 'agent_message_chunk',
              content: { type: 'text', text: 'reply.' },
            },
          },
        ],
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);

    const feed = (
      await host.caller.feed.subscribe({ ...created, after: null })
    )[Symbol.asyncIterator]();

    await feed.next();
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Reply' }],
    });
    const updates = await collectUntilIdle(feed);

    const page = await host.caller.feed.page({ ...created, direction: 'tail' });
    expect(
      page.rows.filter((row) => row.sessionUpdate === 'agent_message'),
    ).toMatchObject([
      { state: 'settled', content: [{ type: 'text', text: 'First reply.' }] },
    ]);
    expect(
      updates
        .slice(0, -1)
        .some(
          (update) =>
            update.type === 'row.upsert' &&
            update.row.sessionUpdate === 'agent_message',
        ),
    ).toBe(true);
    await feed.return?.();
  });
});
