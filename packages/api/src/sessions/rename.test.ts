import { SessionInfo, SessionSnapshot } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { sessionTitleMocks, unreachableServices } from '../../mocks';
import { appRouter } from '../root';

describe('Session title contracts', (): void => {
  it.each(sessionTitleMocks)(
    'serves the $name title mock for $session.agent',
    async ({ session, snapshot, renameInput }): Promise<void> => {
      const caller = appRouter.createCaller({
        services: unreachableServices({
          session: {
            list: async (): Promise<{
              sessions: (typeof session)[];
              nextCursor: null;
            }> => ({ sessions: [session], nextCursor: null }),
            rename: async (input): Promise<Record<string, never>> => {
              expect(input).toEqual(renameInput);
              return {};
            },
          },
          feed: {
            subscribe: async function* (): AsyncGenerator<
              { type: 'snapshot'; snapshot: typeof snapshot },
              void,
              Parameters<typeof structuredClone>[0]
            > {
              yield { type: 'snapshot', snapshot };
            },
          },
        }),
      });
      await expect(caller.session.list({ archived: false })).resolves.toEqual({
        sessions: [session],
        nextCursor: null,
      });
      const snapshots = [];
      for await (const event of await caller.feed.subscribe({
        sessionId: session.sessionId,
        after: null,
      }))
        snapshots.push(event);
      expect(snapshots).toEqual([{ type: 'snapshot', snapshot }]);
      await expect(caller.session.rename(renameInput)).resolves.toEqual({});
    },
  );

  it.each([
    { sessionId: 'session-1' },
    { sessionId: 'session-1', title: 42 },
    { sessionId: 'session-1', title: 'Title', titleSource: 'agent' },
  ])('rejects malformed rename input: %j', async (input): Promise<void> => {
    const caller = appRouter.createCaller({ services: unreachableServices() });
    await expect(caller.session.rename(input as never)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('rejects an unrecognised title source in the list and snapshot', (): void => {
    const mock = sessionTitleMocks[0];
    if (!mock) throw new Error('Missing title mock');
    expect(
      SessionInfo.safeParse({ ...mock.session, titleSource: 'unknown' })
        .success,
    ).toBe(false);
    expect(
      SessionSnapshot.safeParse({ ...mock.snapshot, titleSource: 'unknown' })
        .success,
    ).toBe(false);
  });
});
