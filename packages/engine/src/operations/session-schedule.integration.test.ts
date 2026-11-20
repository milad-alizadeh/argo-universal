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

it('keeps enqueueing while a mock Agent holds the first steer', async () => {
  const fixture = await startSteeringFixture();
  const { sessionId } = fixture;
  const session = fixture.caller.session;
  await session.schedulePrompt({
    sessionId,
    intervalSeconds: 1,
    prompt: [{ type: 'text', text: 'Check again' }],
  });

  try {
    await fixture.received.promise;
    await expect
      .poll(
        async () => (await session.get({ sessionId })).promptQueue.items.length,
        { timeout: 8000 },
      )
      .toBeGreaterThanOrEqual(2);
  } finally {
    fixture.result.resolve({ outcome: 'injected' });
    fixture.turnEnded.resolve();
  }
}, 30000);
