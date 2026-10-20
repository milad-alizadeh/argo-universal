import type { NotificationEvent } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  type NotificationApp,
  connectNotificationApp,
} from '#mocks/notification-app';
import { defaultAttentionLeaseMs, defaultLifetimeMs } from './options';

interface ManualClock {
  now: () => number;
  advance: (ms: number) => void;
}

function manualClock(): ManualClock {
  let time = 1_000_000;

  return { now: () => time, advance: (ms) => (time += ms) };
}

async function startTimed(): Promise<{
  clock: ManualClock;
  url: string;
}> {
  const clock = manualClock();

  const host = await startEngineTestHost({
    notificationOptions: { now: clock.now, retryMs: 10 },
  });

  return { clock, url: host.url };
}

async function endTurn(app: NotificationApp, text: string): Promise<void> {
  const before = app.notifications.length;
  await app.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text }],
  });
  await expect.poll(() => app.notifications.length).toBe(before + 1);
}

it('stops suppressing a Session once its attention lease has run out', async () => {
  const { clock, url } = await startTimed();
  const viewing = connectNotificationApp(url, false);
  const receiving = connectNotificationApp(url);
  await Promise.all([viewing.ready, receiving.ready]);
  await viewing.client.notifications.attention.mutate({
    sessionId: 'session-1',
  });
  clock.advance(defaultAttentionLeaseMs);
  await endTurn(receiving, 'Lease lapsed');
  expect(receiving.notifications[0]).toMatchObject({
    kind: 'turn_ended',
    sessionId: 'session-1',
  });
});

async function startWithUnacknowledgedEvent(): Promise<{
  app: NotificationApp;
  clock: ManualClock;
  event: NotificationEvent;
}> {
  const { clock, url } = await startTimed();
  const app = connectNotificationApp(url);
  await app.ready;
  await endTurn(app, 'Expire me');
  const event = app.notifications[0];

  if (!event) throw new Error('Expected a notification');

  return { app, clock, event };
}

it('redelivers an unacknowledged event 1 ms before its lifetime is over', async () => {
  const { app, clock, event } = await startWithUnacknowledgedEvent();

  clock.advance(defaultLifetimeMs - 1);

  await expect.poll(() => app.notifications.length).toBe(2);
  expect(app.notifications[1]).toEqual(event);
});

it('expires an unacknowledged event once its lifetime is over', async () => {
  const { app, clock, event } = await startWithUnacknowledgedEvent();

  clock.advance(defaultLifetimeMs);
  await endTurn(app, 'Sweep');

  expect(
    await app.client.notifications.acknowledge.mutate({ id: event.id }),
  ).toBe(false);
});
