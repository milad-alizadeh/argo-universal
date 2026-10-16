import { startAcpEngine } from '@repo/engine/mocks/acp-engine';
import { expect, it, onTestFinished } from 'vitest';
import { openNotificationTransport } from '../../../../mocks/notification-transport';
import { readNotificationBaselines } from './notification-feed';
import { NotificationReader } from './notification-reader';
import type { SessionNotification } from './session-notifications';

it('observes a new input request after close and reopen within one list publication', async () => {
  const host = await startAcpEngine({
    steps: [
      {
        type: 'elicitation',
        request: {
          mode: 'form',
          message: 'Question repeated after reopen',
          requestedSchema: {
            type: 'object',
            properties: { title: { type: 'string', title: 'Title' } },
          },
        },
      },
    ],
  });

  const client = openNotificationTransport(host.url);
  const notices: SessionNotification[] = [];

  const reader = new NotificationReader(
    client,
    await readNotificationBaselines(client),
    (notice) => notices.push(notice),
  );

  reader.setActive(true);

  const updates = client.session.listUpdates.subscribe(undefined, {
    onData: (update) => reader.receive(update),
  });

  onTestFinished(() => {
    reader.setActive(false);
    updates.unsubscribe();
  });
  await client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'First input' }],
  });
  await expect
    .poll(() => notices.filter((notice) => notice.body === 'Needs your input'))
    .toHaveLength(1);
  await client.session.close.mutate({ sessionId: 'session-1' });
  await client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Second input' }],
  });
  await expect
    .poll(() => notices.filter((notice) => notice.body === 'Needs your input'))
    .toHaveLength(2);
});
