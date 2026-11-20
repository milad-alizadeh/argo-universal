import type { PromptRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { runOperation } from '#mocks/operations';
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
  const { sessionId, caller } = journey.caller;
  const text = 'Check after restart';
  await runOperation(caller.operations, {
    id: 'session.schedulePrompt',
    params: { sessionId, intervalSeconds: 2, prompt: [{ type: 'text', text }] },
  });
  await journey.host.stop();
  const received: PromptRequest[] = [];

  const restored = await startAcpEngine({
    steps: [],
    restartOver: journey.host.home,
    responses: {
      'session/prompt': [{ prompt: text, requests: received }],
    },
  });

  await expect
    .poll(() => received.length, { timeout: 10000 })
    .toBeGreaterThan(0);
  const [row] = await restored.caller.session.listSchedules({ sessionId });
  expect(row?.lastQueuedAt).toEqual(expect.any(Number));
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
