import { expect, it } from 'vitest';
import { startRouterTestHost } from '#mocks/router';

it('rejects a Feed page limit above 200 through the real router', async (): Promise<void> => {
  const { caller } = startRouterTestHost();
  await expect(
    caller.feed.page({ sessionId: 'session-1', direction: 'tail', limit: 201 }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});
