import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

it('rejects a Feed page limit above 200 through the real router', async (): Promise<void> => {
  const { caller } = await startEngineTestHost();
  await expect(
    caller.feed.page({ sessionId: 'session-1', direction: 'tail', limit: 201 }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});
