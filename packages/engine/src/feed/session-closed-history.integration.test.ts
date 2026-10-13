import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { upsertRowEvent } from '#mocks/feed-inputs';
import { drainClosedFeed } from '#mocks/feed-observations';
import {
  database,
  runtimeDirectory,
  feedTestHost,
  controller,
  setFeedTestHost,
} from '#mocks/feed-suite';
import { scriptedEngineInput } from '#mocks/scripted-engine';
it('reads a closed Session Feed without opening a Session', async (): Promise<void> => {
  vi.useRealTimers();
  const input = scriptedEngineInput();
  setFeedTestHost(
    await startEngineTestHost({
      database,
      runtimeDirectory,
      ...input,
    }),
  );
  const events = await drainClosedFeed(
    (
      await feedTestHost
        .createCaller({ signal: controller.signal })
        .feed.subscribe({
          sessionId: 'session-1',
          after: { epoch: 3, revision: 3 },
        })
    )[Symbol.asyncIterator](),
  );
  expect(events.map((event): typeof event.type => event.type)).toEqual([
    upsertRowEvent,
    upsertRowEvent,
    'snapshot',
    'closed',
  ]);
  expect(events.at(-1)).toEqual({ type: 'closed', failure: null });
  expect(events[2]).toMatchObject({
    snapshot: {
      state: 'idle',
      configOptions: [],
      maxRevision: 5,
      title: '',
      titleSource: 'prompt',
      checkout: { type: 'main', path: '/project', branch: null },
    },
  });
  expect(input.agent.processes).toHaveLength(0);
});
