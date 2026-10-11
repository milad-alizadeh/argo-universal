import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { startAcpEngine, emptySessionInput } from '#mocks/acp-engine';

it.each(['accepted', 'rejected'] as const)(
  'keeps a live Session and Feed durable while a catalog replacement is %s',
  async (catalogResult) => {
    const response = Promise.withResolvers<unknown>();
    const fetchAgents = vi.fn<() => Promise<unknown>>(() => response.promise);
    const host = await startAcpEngine({
      fetchAgents,
      steps: [
        {
          type: 'update',
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: 'Live catalog reply' },
          },
        },
      ],
    });
    const { sessionId } = await host.caller.session.new(emptySessionInput);
    const refresh = host.caller.agents
      .syncCatalog()
      .catch((error: unknown) => error);
    await vi.waitFor(() => expect(fetchAgents).toHaveBeenCalledTimes(1));
    await host.caller.session.prompt({
      sessionId,
      prompt: [{ type: 'text', text: 'Keep working' }],
    });
    await vi.waitFor(() =>
      expect(
        host.database.$client
          .prepare('SELECT status FROM turn WHERE session_id = ?')
          .get(sessionId),
      ).toEqual({ status: 'ended' }),
    );
    const savedFeed = host.database.$client
      .prepare(
        'SELECT session_update, payload FROM feed_row WHERE session_id = ? ORDER BY rowid',
      )
      .all(sessionId);
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
        .all(sessionId),
    ).toEqual(savedFeed);
    expect(
      (
        await host.caller.feed.page({
          sessionId,
          direction: 'tail',
        })
      ).rows,
    ).toHaveLength(2);
    await host.caller.session.close({ sessionId });
  },
);
