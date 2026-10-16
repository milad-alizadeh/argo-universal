import { expect, it } from 'vitest';
import { waitFor } from 'xstate';
import { startEngineTestHost } from '#mocks/engine';
import {
  type NotificationApp,
  connectNotificationApp,
} from '#mocks/notification-app';

it('suppresses a Session viewed on any real Connection', async () => {
  const host = await startEngineTestHost();
  const first = connectNotificationApp(host.url);
  const second = connectNotificationApp(host.url);
  await Promise.all([first.ready, second.ready]);
  await first.client.notifications.attention.mutate({ sessionId: 'session-1' });
  await second.client.notifications.attention.mutate({ sessionId: null });
  await host.caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Quiet everywhere' }],
  });
  await expect
    .poll(() => host.databaseWriter.getSnapshot().context.queue.length)
    .toBe(0);
  await waitFor(host.openSessions, (snapshot) =>
    Object.values(snapshot.context.sessions).every(
      (actor) => actor.getSnapshot().context.activeTurnId === null,
    ),
  );
  await expect
    .poll(() => host.databaseWriter.getSnapshot().context.queue.length)
    .toBe(0);
  expect(first.notifications).toEqual([]);
  expect(second.notifications).toEqual([]);
});

it('notifies every real Connection while another page is active', async () => {
  const host = await startEngineTestHost();
  const first = connectNotificationApp(host.url);
  const second = connectNotificationApp(host.url);
  await Promise.all([first.ready, second.ready]);
  await first.client.notifications.attention.mutate({
    sessionId: 'another-session',
  });
  await host.caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Notify while elsewhere' }],
  });
  await expect.poll(() => first.notifications).toHaveLength(1);
  await expect.poll(() => second.notifications).toHaveLength(1);
  expect(first.notifications[0]).toMatchObject({
    kind: 'turn_ended',
    sessionId: 'session-1',
  });
  expect(first.notifications[0]).toEqual(second.notifications[0]);
});

const attentionLoss = [
  {
    loss: 'disconnect',
    release: (app: NotificationApp): Promise<void> => app.close(),
  },
  {
    loss: 'unsubscribe',
    release: async (app: NotificationApp): Promise<void> => {
      app.stop();
    },
  },
];

it.each(attentionLoss)(
  'releases Session attention after $loss',
  async ({ release }) => {
    const host = await startEngineTestHost();

    const viewing = connectNotificationApp(host.url, false);
    const receiving = connectNotificationApp(host.url);
    await Promise.all([viewing.ready, receiving.ready]);
    await viewing.client.notifications.attention.mutate({
      sessionId: 'session-1',
    });

    await release(viewing);
    await receiving.client.session.prompt.mutate({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'No stale attention' }],
    });
    await expect.poll(() => receiving.notifications).toHaveLength(1);
  },
);
