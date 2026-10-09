import { createMockAdapter } from '@repo/mocks/agent';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { messageChange } from '#mocks/feed';

it.each(['accepted', 'rejected'] as const)(
  'keeps a live Session and Feed durable while a catalog replacement is %s',
  async (catalogResult) => {
    const response = Promise.withResolvers<unknown>();
    const fetchAgents = vi.fn<() => Promise<unknown>>(() => response.promise);
    const host = await startEngineTestHost({
      fetchAgents,
      adapters: [
        createMockAdapter({
          stream: (peer) => {
            peer.receive((command) => {
              if (command.type !== 'agent.prompt') return;
              peer.send({
                type: 'agent.feed',
                change: messageChange('settled'),
              });
              peer.send({ type: 'agent.turnEnded', stopReason: 'end_turn' });
            });
          },
        }),
      ],
    });
    host.sessionRegistry.send({
      type: 'sessions.open',
      sessionId: 'session-1',
      agent: 'mock',
    });
    await vi.waitFor(() =>
      expect(
        host.database.$client
          .prepare('SELECT vendor_session_id FROM session WHERE id = ?')
          .get('session-1'),
      ).toEqual({ vendor_session_id: 'vendor-1' }),
    );
    const refresh = host.caller.agents
      .syncCatalog()
      .catch((error: unknown) => error);
    await vi.waitFor(() => expect(fetchAgents).toHaveBeenCalledTimes(1));
    await host.caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Keep working' }],
    });
    await vi.waitFor(() =>
      expect(
        host.database.$client
          .prepare('SELECT status FROM turn WHERE session_id = ?')
          .get('session-1'),
      ).toEqual({ status: 'ended' }),
    );
    const savedFeed = host.database.$client
      .prepare(
        'SELECT session_update, payload FROM feed_row WHERE session_id = ? ORDER BY rowid',
      )
      .all('session-1');
    expect(savedFeed).toEqual([
      expect.objectContaining({ session_update: 'user_message' }),
      expect.objectContaining({ session_update: 'agent_message' }),
    ]);
    response.resolve(
      catalogResult === 'accepted' ? publishedRegistry : { malformed: true },
    );
    expect(await refresh).toEqual({ accepted: true });
    await expect
      .poll(async () => (await host.caller.agents.catalog()).syncStatus)
      .toBe(catalogResult === 'accepted' ? 'idle' : 'failed');
    expect(
      host.database.$client
        .prepare(
          'SELECT session_update, payload FROM feed_row WHERE session_id = ? ORDER BY rowid',
        )
        .all('session-1'),
    ).toEqual(savedFeed);
    expect(
      (
        await host.caller.feed.page({
          sessionId: 'session-1',
          direction: 'tail',
        })
      ).rows,
    ).toHaveLength(2);
    await host.caller.session.close({ sessionId: 'session-1' });
  },
);
