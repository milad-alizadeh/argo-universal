import { describe, expect, it, vi } from 'vitest';
import { associationsOf } from './change-associations';
import type { OperationRunner } from './page-calls-ports';

const scope = { sessionId: 'session-1', projectId: 'project-1' };

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
    const set = vi.fn<(unread: unknown[]) => void>();

    const run = vi.fn<OperationRunner['run']>(() =>
      Promise.resolve({
        result: { changes: [{ repository: 'o/a', number: 3, error: 'down' }] },
      }),
    );

    await associationsOf(runner(run), scope, { unread: [], set }).refresh?.();
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'refresh' }),
    );
    expect(set).toHaveBeenCalledWith([
      { repository: 'o/a', number: 3, error: 'down' },
    ]);
  });
});
