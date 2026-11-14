import { describe, expect, it, vi } from 'vitest';
import { associationsOf } from './change-associations';
import type { OperationRunner } from './page-calls-ports';
import { createUnreadReader, readUnread } from './unread-reader';

const session = { sessionId: 'session-1', projectId: 'project-1' };

const signInFailure = {
  repository: 'owner/app',
  number: 31,
  error: 'Sign in to GitHub to read this pull request.',
};

type Result = Awaited<ReturnType<OperationRunner['run']>>['result'];

const answering = (result: Result): OperationRunner['run'] =>
  vi.fn<OperationRunner['run']>(() => Promise.resolve({ result }));

describe('createUnreadReader', () => {
  it('drops a slow first list that lands after a refresh has already answered', async () => {
    const first = Promise.withResolvers<[typeof signInFailure] | undefined>();
    const published = vi.fn<(unread: unknown[]) => void>();
    const reader = createUnreadReader(() => first.promise, published);
    const reading = reader.reload();

    reader.set([]);
    first.resolve([signInFailure]);
    await reading;

    expect(published.mock.calls).toEqual([[[]]]);
  });

  it('leaves what is known when an answer says nothing', async () => {
    const published = vi.fn<(unread: unknown[]) => void>();

    const reader = createUnreadReader(
      () => readUnread(answering(null), session),
      published,
    );

    await reader.reload();
    reader.set(undefined);

    expect(published).not.toHaveBeenCalled();
  });

  it('drops a reading still in flight once cancelled, as when the Session changes', async () => {
    const slow = Promise.withResolvers<[typeof signInFailure]>();
    const published = vi.fn<(unread: unknown[]) => void>();
    const reader = createUnreadReader(() => slow.promise, published);
    const reading = reader.reload();

    reader.cancel();
    slow.resolve([signInFailure]);
    await reading;

    expect(published).not.toHaveBeenCalled();
  });
});

describe('a first read that failed', () => {
  it('shows the unread notice after an initial sign-in failure, and clears it when the retry succeeds', async () => {
    const shown: unknown[][] = [];
    const lists = answering({ changes: [signInFailure] });
    const refreshes = answering({ changes: [{ id: 'github:owner/app#31' }] });

    const reader = createUnreadReader(
      () => readUnread(lists, session),
      (unread) => shown.push(unread),
    );

    await reader.reload();
    expect(shown.at(-1)).toEqual([signInFailure]);

    const actions = associationsOf(
      { run: refreshes, failed: vi.fn<OperationRunner['failed']>() },
      session,
      {
        reading: { unread: [], set: reader.set, reload: reader.reload },
      },
    );

    await actions.refresh();
    expect(shown.at(-1)).toEqual([]);
  });

  it('keeps the notice when the read of the list itself fails or is unreadable', async () => {
    const shown: unknown[][] = [];

    const failing = vi.fn<OperationRunner['run']>(() =>
      Promise.reject(new Error('down')),
    );

    const reader = createUnreadReader(
      () => readUnread(failing, session),
      (unread) => shown.push(unread),
    );

    await reader.reload();
    reader.set(await readUnread(answering(null), session));

    expect(shown).toEqual([]);
  });
});
