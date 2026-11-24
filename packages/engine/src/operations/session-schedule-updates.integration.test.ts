import { expect, it } from 'vitest';
import { delegationJourney } from '#mocks/session-delegation';

const text = 'Check open pull requests';

it('pushes a Session Schedule list when a Schedule is created, paused and deleted', async () => {
  const journey = await delegationJourney();
  const { sessionId } = journey.caller;
  const { session } = journey.host.caller;
  const updates = await session.scheduleUpdates({ sessionId });
  const watcher = updates[Symbol.asyncIterator]();

  try {
    expect((await watcher.next()).value).toEqual([]);

    const created = await session.schedulePrompt({
      sessionId,
      intervalSeconds: 60,
      prompt: [{ type: 'text', text }],
    });

    expect((await watcher.next()).value).toMatchObject([
      { id: created.id, paused: false },
    ]);

    await session.manageSchedule({
      sessionId,
      id: created.id,
      action: 'pause',
    });

    expect((await watcher.next()).value).toMatchObject([
      { id: created.id, paused: true, state: 'paused' },
    ]);

    await session.manageSchedule({
      sessionId,
      id: created.id,
      action: 'delete',
    });

    expect((await watcher.next()).value).toEqual([]);
  } finally {
    await watcher.return?.();
  }
}, 30_000);
