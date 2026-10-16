import { turn } from '@repo/db/schema';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { startEngineTestHost } from '#mocks/engine';
import { connectNotificationApp } from '#mocks/notification-app';
import {
  seedNotificationHistory,
  movingSessionId,
} from '#mocks/notification-history';

it('notifies for the parent Turn without a second notification for its Subagent', async () => {
  const host = await startAcpEngine(scenarios['subagent-foreground']);
  const app = connectNotificationApp(host.url);
  await app.ready;
  await app.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Delegate a review' }],
  });
  await waitForAcpSessionIdle(host, 'session-1');
  await expect
    .poll(() => host.databaseWriter.getSnapshot().context.queue.length)
    .toBe(0);
  expect(
    await app.client.session.subagents.query({ sessionId: 'session-1' }),
  ).toHaveLength(1);
  await expect.poll(() => app.notifications).toHaveLength(1);
  expect(app.notifications[0]).toMatchObject({
    sessionId: 'session-1',
    kind: 'turn_ended',
  });
});

it('does not infer events from populated history or archive restoration', async () => {
  const host = await startEngineTestHost();
  seedNotificationHistory(host.database);
  await host.caller.session.archive({ sessionId: movingSessionId });
  const app = connectNotificationApp(host.url);
  await app.ready;
  await app.client.session.unarchive.mutate({ sessionId: movingSessionId });
  await app.client.session.prompt.mutate({
    sessionId: movingSessionId,
    prompt: [{ type: 'text', text: 'A new Turn' }],
  });
  await expect.poll(() => app.notifications).toHaveLength(1);
  expect(app.notifications[0]).toMatchObject({
    kind: 'turn_ended',
    sessionId: movingSessionId,
  });
  expect(app.notifications[0]?.id).not.toContain('first-turn');
});

it('reconnects after Engine restart with stable Server identity and no historical replay', async () => {
  const host = await startEngineTestHost();
  const app = connectNotificationApp(host.url);
  const original = await app.ready;
  await app.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Before restart' }],
  });
  await expect.poll(() => app.notifications).toHaveLength(1);
  const firstId = app.notifications[0]?.id;
  await host.stop();

  const restarted = await startEngineTestHost({
    home: host.home,
    port: Number(new URL(host.url).port),
  });

  await expect.poll(() => app.handshakes, { timeout: 3000 }).toHaveLength(2);
  expect(app.handshakes.map((handshake) => handshake.serverId)).toEqual([
    original.serverId,
    original.serverId,
  ]);
  await app.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'After restart' }],
  });
  await expect.poll(() => app.notifications).toHaveLength(2);
  expect(app.notifications[1]?.id).not.toBe(firstId);
  await restarted.stop();
});

const interruptedTurnId = 'interrupted-turn';

it('does not notify for a Turn ending that startup recovery writes', async () => {
  const host = await startEngineTestHost();
  const app = connectNotificationApp(host.url);
  const original = await app.ready;
  host.database
    .insert(turn)
    .values({
      id: interruptedTurnId,
      sessionId: 'session-1',
      status: 'running',
    })
    .run();
  await host.stop();

  const restarted = await startEngineTestHost({
    home: host.home,
    port: Number(new URL(host.url).port),
  });

  const tail = await restarted.caller.feed.page({
    sessionId: 'session-1',
    direction: 'tail',
  });

  expect(tail.rows).toContainEqual(
    expect.objectContaining({
      turnId: interruptedTurnId,
      _meta: { argo: { turnEnd: expect.anything() } },
    }),
  );
  await expect.poll(() => app.handshakes, { timeout: 3000 }).toHaveLength(2);
  expect(app.handshakes[1]?.serverId).toBe(original.serverId);
  await app.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'After recovery' }],
  });
  await expect.poll(() => app.notifications).toHaveLength(1);
  expect(app.notifications[0]?.turnId).not.toBe(interruptedTurnId);
  await restarted.stop();
});
