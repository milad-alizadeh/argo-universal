import { expect, it, vi } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { busyJourney, senders, text } from '#mocks/session-prompter';

const pluginLater = 'Plugin later';

it('queues behind the person’s queued Prompts, keeps its sender and starts when the queue reaches it', async () => {
  const journey = await busyJourney();
  await journey.run(journey.session.sessionId, 'First');
  await journey.entered.promise;
  await journey.host.caller.session.submit({
    sessionId: journey.session.sessionId,
    prompt: text('Mine'),
  });

  await expect(
    journey.run(journey.session.sessionId, pluginLater),
  ).resolves.toEqual({
    result: { status: 'queued', queuedId: expect.any(String) },
  });
  journey.release.resolve();
  await vi.waitFor(() => expect(journey.requests).toHaveLength(3));

  expect(journey.requests.map(({ prompt }) => prompt)).toEqual([
    text('First'),
    text('Mine'),
    text(pluginLater),
  ]);
  expect((await senders(journey)).slice(1)).toEqual([
    [JSON.stringify(text('Mine')), { type: 'user' }],
    [
      JSON.stringify(text(pluginLater)),
      { type: 'plugin', pluginId: 'prompter', title: 'Prompter' },
    ],
  ]);
}, 30_000);

it('leaves a paused queue paused when it appends', async () => {
  const journey = await busyJourney();
  await journey.run(journey.session.sessionId, 'First');
  await journey.entered.promise;
  await journey.host.caller.session.submit({
    sessionId: journey.session.sessionId,
    prompt: text('Mine'),
  });
  await journey.host.caller.session.cancel(journey.session);
  await waitForAcpSnapshot(
    journey.host,
    journey.session.sessionId,
    (snapshot) => snapshot.state === 'idle' && snapshot.activeTurnId === null,
  );

  await expect(
    journey.run(journey.session.sessionId, pluginLater),
  ).resolves.toEqual({
    result: { status: 'queued', queuedId: expect.any(String) },
  });
  journey.release.resolve();
  await new Promise((resolve) => setTimeout(resolve, 300));

  expect(journey.requests).toHaveLength(1);
}, 30_000);
