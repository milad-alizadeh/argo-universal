import { expect, it, vi } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
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

type Pushed = {
  id: string;
  state: string;
  endsAt: number | null;
  lastQueuedAt: number | null;
  lastSkippedAt: number | null;
}[];

// The next pushed list that satisfies `wanted`, skipping the ones before it.
async function pushedUntil(
  watcher: AsyncIterator<Pushed>,
  wanted: (list: Pushed) => boolean,
): Promise<Pushed> {
  for (;;) {
    const { value, done } = await watcher.next();

    if (done) throw new Error('The Schedule updates ended');

    if (wanted(value)) return value;
  }
}

it('pushes the list when an occurrence is queued', async () => {
  const journey = await delegationJourney();
  const { sessionId } = journey.caller;
  const { session } = journey.host.caller;

  const watcher = (await session.scheduleUpdates({ sessionId }))[
    Symbol.asyncIterator
  ]();

  try {
    await session.schedulePrompt({
      sessionId,
      intervalSeconds: 1,
      prompt: [{ type: 'text', text }],
    });

    const list = await pushedUntil(
      watcher,
      ([one]) => one?.lastQueuedAt != null,
    );

    expect(list).toHaveLength(1);
  } finally {
    await watcher.return?.();
  }
}, 30_000);

it('pushes the list when its end time is changed', async () => {
  const journey = await delegationJourney();
  const { sessionId } = journey.caller;
  const { session } = journey.host.caller;

  const watcher = (await session.scheduleUpdates({ sessionId }))[
    Symbol.asyncIterator
  ]();

  const endsAt = Date.now() + 7_200_000;

  try {
    const created = await session.schedulePrompt({
      sessionId,
      intervalSeconds: 3600,
      prompt: [{ type: 'text', text }],
    });

    await session.manageSchedule({
      sessionId,
      id: created.id,
      action: 'setEnd',
      endsAt,
    });

    expect(
      await pushedUntil(watcher, ([one]) => one?.endsAt === endsAt),
    ).toHaveLength(1);
  } finally {
    await watcher.return?.();
  }
}, 30_000);

it('pushes the list as expired when its end time passes', async () => {
  const journey = await delegationJourney();
  const { sessionId } = journey.caller;
  const { session } = journey.host.caller;

  const watcher = (await session.scheduleUpdates({ sessionId }))[
    Symbol.asyncIterator
  ]();

  try {
    const created = await session.schedulePrompt({
      sessionId,
      intervalSeconds: 3600,
      prompt: [{ type: 'text', text }],
    });

    await session.manageSchedule({
      sessionId,
      id: created.id,
      action: 'setEnd',
      endsAt: Date.now() + 5000,
    });

    expect(
      await pushedUntil(watcher, ([one]) => one?.state === 'expired'),
    ).toHaveLength(1);
  } finally {
    await watcher.return?.();
  }
}, 30_000);

it('pushes the list when an occurrence missed while the Server was down is skipped', async () => {
  const journey = await delegationJourney();
  const { sessionId } = journey.caller;

  const original = await journey.host.caller.session.schedulePrompt({
    sessionId,
    intervalSeconds: 60,
    prompt: [{ type: 'text', text }],
  });

  await journey.host.stop();

  const clock = vi
    .spyOn(Date, 'now')
    .mockReturnValue(original.nextAt + 7_200_000);

  try {
    const restored = await startAcpEngine({
      steps: [],
      restartOver: journey.host.home,
    });

    const watcher = (
      await restored.caller.session.scheduleUpdates({ sessionId })
    )[Symbol.asyncIterator]();

    try {
      const list = await pushedUntil(
        watcher,
        ([one]) => one?.lastSkippedAt != null,
      );

      expect(list).toHaveLength(1);
    } finally {
      await watcher.return?.();
    }
  } finally {
    clock.mockRestore();
  }
}, 30_000);

it('pushes the list when a task Schedule is run now', async () => {
  const journey = await delegationJourney({ replies: [{ prompt: text }] });
  const { project, session } = journey.host.caller;

  const saved = await project.scheduleCreate({
    projectId: 'project-1',
    agent: 'mock',
    instructions: text,
    cadence: { type: 'interval' as const, intervalSeconds: 3600 },
  });

  const watcher = (
    await session.scheduleUpdates({ sessionId: saved.sessionId })
  )[Symbol.asyncIterator]();

  try {
    await project.scheduleRunNow({ id: saved.id, projectId: saved.projectId });

    expect(
      await pushedUntil(watcher, ([one]) => one?.lastQueuedAt != null),
    ).toHaveLength(1);
  } finally {
    await watcher.return?.();
  }
}, 30_000);
