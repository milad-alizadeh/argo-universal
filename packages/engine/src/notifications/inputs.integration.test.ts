import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { connectNotificationApp } from '#mocks/notification-app';

it.each(['permission', 'elicitation'] as const)(
  'notifies for an authoritative %s request',
  async (kind) => {
    const host = await startAcpEngine(scenarios[kind]);
    const app = connectNotificationApp(host.url);
    await app.ready;
    await app.client.session.prompt.mutate({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Ask for input' }],
    });
    await expect.poll(() => app.notifications).toHaveLength(1);
    expect(app.notifications[0]).toMatchObject({
      kind: 'input_requested',
      requestKind: kind,
      sessionId: 'session-1',
    });
  },
);

it('notifies for successive request identities without a Session status transition', async () => {
  const host = await startAcpEngine(scenarios['successive-input']);
  const app = connectNotificationApp(host.url);
  await app.ready;
  await app.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Ask twice' }],
  });
  await expect.poll(() => app.notifications).toHaveLength(1);
  const first = app.notifications[0];

  if (!first || first.kind !== 'input_requested')
    throw new Error('Expected an input notification');
  await app.client.notifications.acknowledge.mutate({ id: first.id });
  await app.client.session.answerElicitation.mutate({
    sessionId: 'session-1',
    requestId: first.requestId,
    action: 'decline',
  });
  await expect.poll(() => app.notifications).toHaveLength(2);
  expect(app.notifications[1]).toMatchObject({
    kind: 'input_requested',
    requestKind: 'elicitation',
  });
  expect(new Set(app.notifications.map((event) => event.id)).size).toBe(2);
});

it('observes the new input request after fast close and reopen', async () => {
  const host = await startAcpEngine(scenarios.elicitation);
  const app = connectNotificationApp(host.url);
  await app.ready;
  await app.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'First request' }],
  });
  await expect.poll(() => app.notifications).toHaveLength(1);
  const first = app.notifications[0];

  if (!first) throw new Error('Expected a notification');
  await app.client.notifications.acknowledge.mutate({ id: first.id });
  await app.client.session.close.mutate({ sessionId: 'session-1' });
  await app.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Second request' }],
  });
  await expect
    .poll(() =>
      app.notifications.filter((event) => event.kind === 'input_requested'),
    )
    .toHaveLength(2);
  expect(new Set(app.notifications.map((event) => event.id)).size).toBe(
    app.notifications.length,
  );
});
