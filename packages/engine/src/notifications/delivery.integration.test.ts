import { expect, it } from 'vitest';
import { waitFor } from 'xstate';
import { startEngineTestHost } from '#mocks/engine';
import {
  type NotificationApp,
  connectNotificationApp,
} from '#mocks/notification-app';

const queueLimit = 64;

async function endTurn(app: NotificationApp, text: string): Promise<void> {
  const before = app.notifications.length;
  await app.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text }],
  });
  await expect.poll(() => app.notifications.length).toBe(before + 1);
}

it('retries the same event until its actual recipient acknowledges it', async () => {
  const retryMs = 40;
  const host = await startEngineTestHost({ notificationOptions: { retryMs } });
  const app = connectNotificationApp(host.url);
  await app.ready;
  await app.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Retry delivery' }],
  });
  await expect.poll(() => app.notifications.length).toBeGreaterThanOrEqual(2);
  const first = app.notifications[0];
  expect(first).toBeDefined();
  expect(app.notifications[1]).toEqual(first);

  if (!first) throw new Error('Expected a notification');
  expect(
    await app.client.notifications.acknowledge.mutate({ id: first.id }),
  ).toBe(true);
  expect(
    await app.client.notifications.acknowledge.mutate({ id: first.id }),
  ).toBe(false);
});

it('announces Turn endings only after the real Writer commits their transaction', async () => {
  const host = await startEngineTestHost();
  const app = connectNotificationApp(host.url);
  await app.ready;
  host.database.$client.exec(
    "CREATE TRIGGER block_turn_end BEFORE UPDATE ON turn WHEN NEW.status = 'ended' BEGIN SELECT RAISE(ABORT, 'blocked Turn end'); END",
  );
  await app.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Commit before notify' }],
  });
  await waitFor(host.databaseWriter, (snapshot) =>
    snapshot.matches('waitingToRetry'),
  );
  expect(app.notifications).toEqual([]);
  host.database.$client.exec('DROP TRIGGER block_turn_end');
  await expect.poll(() => app.notifications, { timeout: 3000 }).toHaveLength(1);
  expect(app.notifications[0]).toMatchObject({ kind: 'turn_ended' });
});

it('discards pending delivery everywhere as soon as an App views its Session', async () => {
  const host = await startEngineTestHost();
  const receiving = connectNotificationApp(host.url);
  const viewing = connectNotificationApp(host.url, false);
  await Promise.all([receiving.ready, viewing.ready]);
  await receiving.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Pending delivery' }],
  });
  await expect.poll(() => receiving.notifications).toHaveLength(1);
  const event = receiving.notifications[0];

  if (!event) throw new Error('Expected a notification');
  await viewing.client.notifications.attention.mutate({
    sessionId: 'session-1',
  });
  expect(
    await receiving.client.notifications.acknowledge.mutate({ id: event.id }),
  ).toBe(false);
  await viewing.client.notifications.attention.mutate({ sessionId: null });
  await receiving.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'A later Turn' }],
  });
  await expect.poll(() => receiving.notifications).toHaveLength(2);
  expect(new Set(receiving.notifications.map((entry) => entry.id)).size).toBe(
    2,
  );
});

it('expires the oldest event when a recipient queue holds 64 unacknowledged events', async () => {
  const host = await startEngineTestHost({
    notificationOptions: { now: () => 1_000_000 },
  });

  const app = connectNotificationApp(host.url);
  await app.ready;

  for (let turn = 0; turn <= queueLimit; turn += 1)
    await endTurn(app, `Turn ${turn}`);
  const ids = app.notifications.map((event) => event.id);
  const kept = [ids[1], ids[queueLimit]];

  const results = await Promise.all(
    [ids[0], ...kept].map((id) =>
      app.client.notifications.acknowledge.mutate({ id: id ?? '' }),
    ),
  );

  expect(results).toEqual([false, true, true]);
});
