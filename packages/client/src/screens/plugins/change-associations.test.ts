import { describe, expect, it, vi } from 'vitest';
import type { ChangeActions } from '#features/sessions';
import { associationsOf, type UnreadReading } from './change-associations';
import type { OperationRunner } from './page-calls-ports';

const scope = { sessionId: 'session-1', projectId: 'project-1' };

const reload = (): Promise<void> => Promise.resolve();

const runner = (run: OperationRunner['run']): OperationRunner => ({
  run,
  failed: vi.fn<OperationRunner['failed']>(),
});

describe('associationsOf', () => {
  it("attaches by the GitHub Plugin's own Operation, for the Session and its Project, with the typed reference", async () => {
    const run = vi.fn<OperationRunner['run']>(() =>
      Promise.resolve({ result: null }),
    );

    await expect(
      associationsOf(runner(run), scope).attach('owner/repo#12'),
    ).resolves.toBe(true);
    expect(run).toHaveBeenCalledWith({
      pluginId: 'github',
      operation: 'attach',
      args: { reference: 'owner/repo#12' },
      ...scope,
    });
  });

  it('detaches the Change by its repository and number, never by number alone', async () => {
    const run = vi.fn<OperationRunner['run']>(() =>
      Promise.resolve({ result: null }),
    );

    await associationsOf(runner(run), scope).detach({
      stage: 'open',
      repository: 'fork/repo',
      number: 12,
      title: 'Same number in a fork',
      mergeable: true,
    });

    expect(run).toHaveBeenCalledWith({
      pluginId: 'github',
      operation: 'detach',
      args: { reference: 'fork/repo#12' },
      ...scope,
    });
  });

  it("says a refusal through the runner's failure toast and answers false, rather than throwing", async () => {
    const refusal = new Error('Pull request not found.');
    const failing = runner(() => Promise.reject(refusal));

    await expect(
      associationsOf(failing, scope).attach('owner/repo#99'),
    ).resolves.toBe(false);
    expect(failing.failed).toHaveBeenCalledWith(refusal);
  });

  it("runs the Plugin's discover for the Session and answers what it found", async () => {
    const run = vi.fn<OperationRunner['run']>(() =>
      Promise.resolve({ result: { result: 'branchless' } }),
    );

    await expect(
      associationsOf(runner(run), scope).discover?.(),
    ).resolves.toMatchObject({ result: 'branchless' });
    expect(run).toHaveBeenCalledWith({
      pluginId: 'github',
      operation: 'discover',
      args: {},
      ...scope,
    });
  });

  it('answers nothing when discover is refused, and says so through the runner', async () => {
    const failing = runner(() => Promise.reject(new Error('no')));

    await expect(
      associationsOf(failing, scope).discover?.(),
    ).resolves.toBeUndefined();
    expect(failing.failed).toHaveBeenCalledTimes(1);
  });

  it('refreshes and reports the pull requests that could not be read', async () => {
    const set = vi.fn<(unread: unknown[] | undefined) => void>();

    const run = vi.fn<OperationRunner['run']>(() =>
      Promise.resolve({
        result: { changes: [{ repository: 'o/a', number: 3, error: 'down' }] },
      }),
    );

    await associationsOf(runner(run), scope, {
      unread: [],
      set,
      reload,
    }).refresh?.();
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'refresh' }),
    );
    expect(set).toHaveBeenCalledWith([
      { repository: 'o/a', number: 3, error: 'down' },
    ]);
  });

  it('wraps a refusal that is not an Error in one, so the failure toast always has an Error to say', async () => {
    const failing = runner(() => Promise.reject('offline'));

    await associationsOf(failing, scope).attach('owner/repo#99');

    expect(failing.failed).toHaveBeenCalledWith(new Error('offline'));
  });

  it.each([
    ['attach', (actions: ChangeActions) => actions.attach('owner/repo#1')],
    ['discover', (actions: ChangeActions) => actions.discover()],
    [
      'detach',
      (actions: ChangeActions) =>
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
        set: vi.fn(),
        reload: again,
      };
      const ok = runner(() =>
        Promise.resolve({ result: { result: 'branchless' } }),
      );
      const refused = runner(() => Promise.reject(new Error('no')));

      await act(associationsOf(refused, scope, reading));
      expect(again).not.toHaveBeenCalled();
      await act(associationsOf(ok, scope, reading));
      expect(again).toHaveBeenCalledTimes(1);
    },
  );

  it('offers the way to the Account sign-in only when the page gave one', () => {
    const signIn = vi.fn<() => void>();

    expect(associationsOf(runner(vi.fn()), scope).signIn).toBeUndefined();
    associationsOf(runner(vi.fn()), scope, undefined, signIn).signIn?.();
    expect(signIn).toHaveBeenCalledTimes(1);
  });
});
