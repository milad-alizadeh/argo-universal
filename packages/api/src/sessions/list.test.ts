import type { SessionListOutput } from '@repo/contracts';
import { describe, expect, it, vi } from 'vitest';
import { unreachableServices } from '../../mocks';
import { appRouter } from '../root';

describe('session.list pagination input', (): void => {
  it('accepts the forward direction supplied by tRPC infinite queries', async (): Promise<void> => {
    const list = vi.fn(async (): Promise<SessionListOutput> => ({
      sessions: [],
      nextCursor: null,
    }));
    const caller = appRouter.createCaller({
      services: unreachableServices({ session: { list } }),
    });
    await expect(
      caller.session.list({ archived: false, direction: 'forward' }),
    ).resolves.toEqual({ sessions: [], nextCursor: null });
    expect(list).toHaveBeenCalledWith({
      archived: false,
      direction: 'forward',
    });
  });

  it('keeps direct queries compatible without a direction', async (): Promise<void> => {
    const caller = appRouter.createCaller({
      services: unreachableServices({
        session: {
          list: async (): Promise<SessionListOutput> => ({
            sessions: [],
            nextCursor: null,
          }),
        },
      }),
    });
    await expect(caller.session.list({ archived: false })).resolves.toEqual({
      sessions: [],
      nextCursor: null,
    });
  });

  it.each([{ direction: 'backward' }, { unexpected: true }])(
    'rejects unsupported pagination and unknown fields: %j',
    async (input): Promise<void> => {
      const caller = appRouter.createCaller({
        services: unreachableServices(),
      });
      await expect(
        Reflect.apply(caller.session.list, undefined, [
          { archived: false, ...input },
        ]),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    },
  );
});
