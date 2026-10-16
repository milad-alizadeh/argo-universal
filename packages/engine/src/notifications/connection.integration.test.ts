import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectNotificationApp } from '#mocks/notification-app';
import { rejectedProcedureCode } from '#mocks/procedure-request';

it('rejects attention without a live WebSocket Connection', async () => {
  const host = await startEngineTestHost();
  expect(
    await rejectedProcedureCode(host.url, {
      path: 'notifications.attention',
      type: 'mutation',
      input: JSON.stringify({ sessionId: 'session-1' }),
    }),
  ).toBe('PRECONDITION_FAILED');
});

it('uses actual Connection identity and refuses a supplied replacement', async () => {
  const host = await startEngineTestHost();
  const app = connectNotificationApp(host.url);
  await app.ready;
  expect(
    await rejectedProcedureCode(host.url, {
      path: 'notifications.attention',
      type: 'mutation',
      input: JSON.stringify({
        sessionId: 'session-1',
        connectionId: 'another-window',
      }),
    }),
  ).toBe('BAD_REQUEST');
});
