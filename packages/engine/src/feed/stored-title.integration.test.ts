import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { database, subscribe, setFeedTestHost } from '#mocks/feed-suite';
import { scriptedEngineInput } from '#mocks/scripted-engine';
it.each(['prompt', 'agent', 'user'] as const)(
  'reads a stored %s title from the public Feed without opening the Session',
  async (titleSource) => {
    database.$client
      .prepare('UPDATE session SET title = ?, title_source = ? WHERE id = ?')
      .run('Session list reconnect investigation', titleSource, 'session-1');
    const input = scriptedEngineInput();
    setFeedTestHost(await startEngineTestHost({ database, ...input }));
    const updates = await subscribe(null);
    expect((await updates.next()).value).toMatchObject({
      type: 'snapshot',
      snapshot: {
        title: 'Session list reconnect investigation',
        titleSource,
        state: 'idle',
        changes: { files: 0, additions: 0, deletions: 0 },
      },
    });
    expect(input.agent.processes).toHaveLength(0);
  },
);
