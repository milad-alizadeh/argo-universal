import type { PromptRequest } from '@agentclientprotocol/sdk';
import { expect, it, vi } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { runOperation } from '#mocks/operations';
import { startSteeringFixture } from '#mocks/queue-steering';
import { delegationJourney, holdSession } from '#mocks/session-delegation';

it('queues a scheduled Prompt while the Turn runs and delivers it when the Turn ends', async () => {
  const release = Promise.withResolvers<void>();
  const received: PromptRequest[] = [];
  const text = 'Check open pull requests';

  const journey = await delegationJourney({
    replies: [
      {
        prompt: 'Keep working',
        steps: [{ type: 'gate', waitFor: release.promise }],
      },
      { prompt: text, requests: received },
    ],
  });

  const { sessionId, caller } = journey.caller;
  await holdSession(journey, sessionId);

  try {
    await runOperation(caller.operations, {
      id: 'session.schedulePrompt',
      params: {
        sessionId,
        intervalSeconds: 1,
        prompt: [{ type: 'text', text }],
      },
    });
    await expect
      .poll(() => journey.host.caller.session.get({ sessionId }), {
        timeout: 8000,
      })
      .toMatchObject({
        promptQueue: { items: [{ prompt: [{ type: 'text', text }] }] },
      });
    expect(received).toHaveLength(0);
  } finally {
    release.resolve();
  }

  await expect.poll(() => received.length).toBe(1);
}, 30_000);

it('restores the Schedule and sends its Prompt after the Engine restarts', async () => {
  const journey = await delegationJourney();
  const { sessionId } = journey.caller;
  const text = 'Check after restart';

  const original = await journey.host.caller.session.schedulePrompt({
    sessionId,
    intervalSeconds: 60,
    prompt: [{ type: 'text', text }],
  });

  await journey.host.stop();
  // Four deadlines passed while the Server was down; the fifth is still in the future.
  const clock = vi.spyOn(Date, 'now').mockReturnValue(original.nextAt + 185000);
  const received: PromptRequest[] = [];

  const restored = await startAcpEngine({
    steps: [],
    restartOver: journey.host.home,
    responses: {
      'session/prompt': [{ prompt: text, requests: received }],
    },
  });

  await expect.poll(() => received.length, { timeout: 10000 }).toBe(1);
  const [row] = await restored.caller.session.listSchedules({ sessionId });
  expect(row?.lastQueuedAt).toBe(original.nextAt + 185000);
  expect(row?.nextAt).toBe(original.nextAt + 240000);
  clock.mockRestore();
}, 30000);

it('pauses, resumes and deletes a Schedule through the public caller', async () => {
  const journey = await delegationJourney();
  const session = journey.host.caller.session;
  const { sessionId } = journey.caller;

  const { id } = await session.schedulePrompt({
    sessionId,
    intervalSeconds: 300,
    prompt: [{ type: 'text', text: 'Check the build' }],
  });

  await session.manageSchedule({ sessionId, id, action: 'pause' });
  expect(await session.listSchedules({ sessionId })).toMatchObject([
    { id, paused: true, lastQueuedAt: null },
  ]);
  await session.manageSchedule({ sessionId, id, action: 'resume' });
  expect(await session.listSchedules({ sessionId })).toMatchObject([
    { id, paused: false },
  ]);
  await session.manageSchedule({ sessionId, id, action: 'delete' });
  expect(await session.listSchedules({ sessionId })).toEqual([]);
}, 30000);

it('coalesces due Prompts without steering an active Turn', async () => {
  const fixture = await startSteeringFixture();
  const { sessionId } = fixture;
  const session = fixture.caller.session;
  let steered = false;
  void fixture.received.promise.then(() => {
    steered = true;
  });

  const followUp = await session.schedulePrompt({
    sessionId,
    intervalSeconds: 1,
    prompt: [{ type: 'text', text: 'Check again' }],
  });

  const queued = async (): Promise<string[]> => {
    const { promptQueue } = await session.get({ sessionId });

    return promptQueue.items
      .filter(
        ({ sender }) =>
          sender?.type === 'schedule' && sender.scheduleId === followUp.id,
      )
      .map(({ id }) => id);
  };

  const nextAt = async (): Promise<number | undefined> =>
    (await session.listSchedules({ sessionId }))[0]?.nextAt;

  try {
    await expect.poll(queued, { timeout: 8000 }).toHaveLength(1);
    await expect
      .poll(nextAt, { timeout: 8000 })
      .toBeGreaterThan(followUp.nextAt);
    const initialDeadline = await nextAt();
    const first = await queued();
    expect.assert(initialDeadline !== undefined);
    expect(first).toHaveLength(1);

    await expect
      .poll(nextAt, { timeout: 8000 })
      .toBeGreaterThan(initialDeadline);
    expect(await queued()).toEqual(first);
    expect(steered).toBe(false);
  } finally {
    fixture.result.resolve({ outcome: 'injected' });
    fixture.turnEnded.resolve();
  }
}, 30000);

it('delivers a one-time Prompt to an idle Session and marks it completed', async () => {
  const text = 'Check once';
  const received: PromptRequest[] = [];

  const journey = await delegationJourney({
    replies: [{ prompt: text, requests: received }],
  });

  const { sessionId } = journey.caller;
  const session = journey.host.caller.session;
  const onceAt = Date.now() + 800;

  const followUp = await session.schedulePrompt({
    sessionId,
    onceAt,
    prompt: [{ type: 'text', text }],
  });

  expect(followUp).toMatchObject({ nextAt: onceAt, state: 'active' });
  await expect.poll(() => received.length, { timeout: 8000 }).toBe(1);
  expect(await session.listSchedules({ sessionId })).toMatchObject([
    { id: followUp.id, state: 'completed' },
  ]);
}, 30000);

it('defaults Interval to one day and saves an edited end time', async () => {
  const journey = await delegationJourney();
  const { sessionId } = journey.caller;
  const session = journey.host.caller.session;
  const startedAt = Date.now();

  const followUp = await session.schedulePrompt({
    sessionId,
    intervalSeconds: 60,
    prompt: [{ type: 'text', text: 'Check until tomorrow' }],
  });

  const day = 86_400_000;

  expect(followUp.endsAt).toBeGreaterThanOrEqual(startedAt + day);
  expect(followUp.endsAt).toBeLessThanOrEqual(Date.now() + day);

  const endsAt = startedAt + 3_600_000;
  await session.manageSchedule({
    sessionId,
    id: followUp.id,
    action: 'setEnd',
    endsAt,
  });
  expect(await session.listSchedules({ sessionId })).toMatchObject([
    { id: followUp.id, nextAt: followUp.nextAt, endsAt },
  ]);
}, 30000);

it('does not recover an overdue Interval after its end time', async () => {
  const journey = await delegationJourney();
  const { sessionId } = journey.caller;
  const session = journey.host.caller.session;

  const expired = await session.schedulePrompt({
    sessionId,
    intervalSeconds: 10,
    endsAt: Date.now() + 60_000,
    prompt: [{ type: 'text', text: 'Expired follow-up' }],
  });

  const recovery = 'Eligible follow-up';
  await session.schedulePrompt({
    sessionId,
    intervalSeconds: 10,
    prompt: [{ type: 'text', text: recovery }],
  });

  await journey.host.stop();
  const expiredRequests: PromptRequest[] = [];
  const recoveredRequests: PromptRequest[] = [];
  const clock = vi.spyOn(Date, 'now').mockReturnValue(expired.nextAt + 60_000);

  try {
    const restored = await startAcpEngine({
      steps: [],
      restartOver: journey.host.home,
      responses: {
        'session/prompt': [
          { prompt: 'Expired follow-up', requests: expiredRequests },
          { prompt: recovery, requests: recoveredRequests },
        ],
      },
    });

    await expect
      .poll(() => recoveredRequests.length, { timeout: 8000 })
      .toBe(1);
    expect(expiredRequests).toEqual([]);
    expect(
      await restored.caller.session.listSchedules({ sessionId }),
    ).toContainEqual(
      expect.objectContaining({
        id: expired.id,
        state: 'expired',
        lastQueuedAt: null,
      }),
    );
  } finally {
    clock.mockRestore();
  }
}, 30000);

it('pauses a due follow-up on an archived Session without queuing its Prompt', async () => {
  const {
    host,
    caller: { sessionId },
  } = await delegationJourney();

  const { session } = host.caller;

  const followUp = await session.schedulePrompt({
    sessionId,
    onceAt: Date.now() + 1500,
    prompt: [{ type: 'text', text: 'Check this later' }],
  });

  await session.archive({ sessionId });
  await expect
    .poll(() => session.listSchedules({ sessionId }), { timeout: 8000 })
    .toMatchObject([{ id: followUp.id, paused: true, lastQueuedAt: null }]);
}, 30_000);
