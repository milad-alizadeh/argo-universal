import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  type NotificationApp,
  connectNotificationApp,
} from '#mocks/notification-app';

const leaseMs = 30_000;

const lifetimeMs = 60_000;

const queueLimit = 64;

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

it('stops suppressing a Session once its 30 second attention lease has run out', async () => {
  const { clock, url } = await startTimed();
  const viewing = connectNotificationApp(url, false);
  const receiving = connectNotificationApp(url);
  await Promise.all([viewing.ready, receiving.ready]);
  await viewing.client.notifications.attention.mutate({
    sessionId: 'session-1',
  });
  clock.advance(leaseMs);
  await endTurn(receiving, 'Lease lapsed');
  expect(receiving.notifications[0]).toMatchObject({
    kind: 'turn_ended',
    sessionId: 'session-1',
  });
});

it('keeps retrying an unacknowledged event until its one minute lifetime is over', async () => {
  const { clock, url } = await startTimed();
  const app = connectNotificationApp(url);
  await app.ready;
  await endTurn(app, 'Expire me');
  const expiring = app.notifications[0];

  if (!expiring) throw new Error('Expected a notification');
  clock.advance(lifetimeMs - 1);
  await expect.poll(() => app.notifications.length).toBe(2);
  expect(app.notifications[1]).toEqual(expiring);
  clock.advance(1);
  await endTurn(app, 'Sweep');
  expect(
    await app.client.notifications.acknowledge.mutate({ id: expiring.id }),
  ).toBe(false);
});

async function fillQueue(app: NotificationApp): Promise<string[]> {
  for (let turn = 0; turn <= queueLimit; turn += 1)
    await endTurn(app, `Turn ${turn}`);

  return app.notifications.map((event) => event.id);
}

it('expires the oldest event when a recipient queue holds 64 unacknowledged events', async () => {
  const { url } = await startTimed();
  const app = connectNotificationApp(url);
  await app.ready;
  const ids = await fillQueue(app);
  const kept = [ids[1], ids[queueLimit]];

  const results = await Promise.all(
    [ids[0], ...kept].map((id) =>
      app.client.notifications.acknowledge.mutate({ id: id ?? '' }),
    ),
  );

  expect(results).toEqual([false, true, true]);
});
