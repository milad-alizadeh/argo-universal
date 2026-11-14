import { describe, expect, it, vi } from 'vitest';
import type { ChangeActions, DiscoveryResult } from '#features/sessions';
import { associationsOf, type UnreadReading } from './change-associations';
import type { OperationRunner } from './page-calls-ports';

const scope = { sessionId: 'session-1', projectId: 'project-1' };

type Acted = boolean | DiscoveryResult | undefined;

const reload = (): Promise<void> => Promise.resolve();

const runner = (run: OperationRunner['run']): OperationRunner => ({
  run,
  failed: vi.fn<OperationRunner['failed']>(),
});

describe('associationsOf, beyond the Operations', () => {
  it('wraps a refusal that is not an Error in one, so the failure toast always has an Error to say', async () => {
    const failing = runner(() => Promise.reject('offline'));

    await associationsOf(failing, scope).attach('owner/repo#99');

    expect(failing.failed).toHaveBeenCalledWith(new Error('offline'));
  });

  it.each([
    [
      'attach',
      (actions: ChangeActions): Promise<Acted> =>
        actions.attach('owner/repo#1'),
    ],
    [
      'discover',
      (actions: ChangeActions): Promise<Acted> => actions.discover(),
    ],
    [
      'detach',
      (actions: ChangeActions): Promise<Acted> =>
        actions.detach({
          stage: 'open',
          repository: 'o/a',
          number: 1,
          title: 'x',
          mergeable: true,
        }),
    ],
  ])(
    'reads the unread list again after %s, which changes what is attached, but not after a refusal',
    async (_name, act) => {
      const again = vi.fn<UnreadReading['reload']>(reload);

      const reading: UnreadReading = {
        unread: [],
        set: vi.fn<UnreadReading['set']>(),
        reload: again,
      };

      const ok = runner(() =>
        Promise.resolve({ result: { result: 'branchless' } }),
      );

      const refused = runner(() => Promise.reject(new Error('no')));

      await act(associationsOf(refused, scope, { reading }));
      expect(again).not.toHaveBeenCalled();
      await act(associationsOf(ok, scope, { reading }));
      expect(again).toHaveBeenCalledTimes(1);
    },
  );

  it('offers the way to the Account sign-in only when the page gave one', () => {
    const signIn = vi.fn<() => void>();

    const reading: UnreadReading = {
      unread: [],
      set: vi.fn<UnreadReading['set']>(),
      reload,
    };

    expect(
      associationsOf(runner(vi.fn<OperationRunner['run']>()), scope).signIn,
    ).toBeUndefined();
    associationsOf(runner(vi.fn<OperationRunner['run']>()), scope, {
      reading,
      signIn,
    }).signIn?.();
    expect(signIn).toHaveBeenCalledTimes(1);
  });
});
