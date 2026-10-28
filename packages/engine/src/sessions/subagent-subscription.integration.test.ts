import type { FeedSubscribeOutput } from '@repo/contracts';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it, onTestFinished, vi } from 'vitest';
import { openAcpFeedSession, waitForAcpSessionIdle } from '#mocks/acp-feed';

async function collectFeed(
  iterator: AsyncIterator<FeedSubscribeOutput>,
  events: FeedSubscribeOutput[],
): Promise<void> {
  while (true) {
    const next = await iterator.next();

    if (next.done) return;
    events.push(next.value);
  }
}

it.each(['open', 'closed'] as const)(
  'reattaches a child subscription started while its parent was %s',
  async (state) => {
    const { host, sessionId } = await openAcpFeedSession(
      scenarios['subagent-more-work'],
    );

    const [child] = await host.caller.session.listAgents({ sessionId });

    if (!child) throw new Error('No Subagent was persisted');

    if (state === 'closed') await host.caller.session.close({ sessionId });
    const controller = new AbortController();
    onTestFinished(() => controller.abort());
    const caller = host.createCaller({ signal: controller.signal });

    const stream = await caller.feed.subscribe({
      sessionId: child.sessionId,
      after: null,
    });

    const iterator = stream[Symbol.asyncIterator]();
    expect((await iterator.next()).value).toMatchObject({ type: 'snapshot' });
    const events: FeedSubscribeOutput[] = [];
    const collecting = collectFeed(iterator, events);

    try {
      if (state === 'open') await host.caller.session.close({ sessionId });
      await host.caller.session.prompt({
        sessionId,
        prompt: [{ type: 'text', text: 'Follow up' }],
      });
      await waitForAcpSessionIdle(host, sessionId);
      await host.caller.session.close({ sessionId });
      await vi.waitFor(() =>
        expect(events).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'row.upsert',
              row: expect.objectContaining({
                sessionUpdate: 'session_message',
                messageId: 'follow-up-incoming',
              }),
            }),
          ]),
        ),
      );
    } finally {
      controller.abort();
      await collecting;
    }
  },
);
