import type { SessionListInput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { seedNotificationHistory } from '#mocks/notification-history';

it.each<{ order: SessionListInput['order']; other: SessionListInput['order'] }>(
  [
    { order: 'created', other: 'activity' },
    { order: 'activity', other: 'created' },
  ],
)(
  'rejects a $order cursor used with $other ordering',
  async ({ order, other }) => {
    const host = await startEngineTestHost();
    seedNotificationHistory(host.database);

    const first = await host.caller.session.list({
      archived: false,
      order,
    });

    expect(first.nextCursor).not.toBeNull();
    await expect(
      host.caller.session.list({
        archived: false,
        order: other,
        cursor: first.nextCursor ?? undefined,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  },
);
