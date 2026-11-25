import { feedEventId } from '@repo/contracts';
import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { expect, it, vi } from 'vitest';
import { waitForCancelStep } from '#mocks/feed-inputs';
import {
  startFeedTestHost,
  createFeedRouterCaller,
  scriptedAgent,
} from '#mocks/feed-suite';
import { identified, type Yielded } from '#mocks/plain-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

type Received = ReturnType<typeof identified>;

interface OpenFeed {
  // What the Server sends until it has nothing more within `quietMs` of fake time.
  drain: (quietMs: number) => Promise<Received[]>;
}

async function open(lastEventId: string | null): Promise<OpenFeed> {
  const updates = (
    await createFeedRouterCaller().feed.subscribe({
      sessionId: 'session-1',
      after: null,
      lastEventId: lastEventId ?? feedEventId({ epoch: 3, revision: 0 }),
    })
  )[Symbol.asyncIterator]();

  let pending: Promise<IteratorResult<Yielded, void>> | undefined;

  return {
    drain: async (quietMs) => {
      const received: Received[] = [];

      for (;;) {
        pending ??= updates.next();

        const next = await Promise.race([
          pending,
          vi.advanceTimersByTimeAsync(quietMs).then(() => null),
        ]);

        if (next === null || next.done) return received;
        pending = undefined;
        received.push(identified(next.value));
      }
    },
  };
}

it('reconnects from a snapshot without losing a row still waiting for its batch', async (): Promise<void> => {
  await startFeedTestHost({ steps: [{ type: waitForCancelStep }] });
  await createFeedRouterCaller().session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Read a file' }],
  });
  await vi.advanceTimersByTimeAsync(1_000);

  const live = await open(null);
  const first = await live.drain(1);

  await requireScriptedProcessAt(scriptedAgent.processes).play(
    feedScenario([
      {
        sessionUpdate: 'tool_call',
        toolCallId: 'a-tool',
        title: 'Read a file',
        kind: 'read',
        status: 'in_progress',
        content: [],
      },
    ]).steps,
    'vendor-1',
  );

  await vi.advanceTimersByTimeAsync(1_000);

  const next = await live.drain(200);

  // A snapshot's id is where the rows an App has end, not the revision the Server holds: a row may still wait for its batch.
  let delivered = 0;

  const snapshotIds = [...first, ...next].flatMap(({ id, event }) => {
    if ('rev' in event) delivered = event.rev;

    return event.type === 'snapshot'
      ? [[id, feedEventId({ epoch: 3, revision: delivered })]]
      : [];
  });

  expect(snapshotIds.length).toBeGreaterThan(1);

  for (const [id, expected] of snapshotIds) expect(id).toBe(expected);
});
