import type { PlanUpdate, SessionUpdate } from '@repo/contracts';
import { QueryObserver, type QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import {
  append,
  beforeAppend,
  page,
  rowEvents,
  streamed,
  upsert,
} from '../../../../mocks/feed-state.mocks';
import { createQueryClient } from '../../../query-cache';
import { emptyFeed, mergeNewestPage, type FeedState } from '../view/feed-state';
import { applyFeedEvents } from './apply-feed-events';
import { feedKey, snapshotKey } from './feed-query';

const { rows, snapshot, stream } = streamed;

const events = rowEvents(stream);

const id = 'session-1';

const rowsUpsert = 'rows.upsert' as const;

const never = (): Promise<SessionUpdate> => new Promise(() => {});

function heldFeed(queryClient: QueryClient, held: FeedState): void {
  queryClient.setQueryData(feedKey(id), held);
}

const readFeed = (queryClient: QueryClient): FeedState | undefined =>
  queryClient.getQueryData(feedKey(id));

// Counts the writes the Feed's query takes.
function writesOf(queryClient: QueryClient): () => number {
  let writes = 0;

  queryClient.getQueryCache().subscribe((event) => {
    if (
      event.type === 'updated' &&
      event.action.type === 'success' &&
      event.query.queryHash === JSON.stringify(feedKey(id))
    )
      writes += 1;
  });

  return () => writes;
}

describe('applyFeedEvents', () => {
  it('merges every event of a frame into the held window with one write', () => {
    const queryClient = createQueryClient();
    heldFeed(queryClient, mergeNewestPage(emptyFeed, page([], 0)));
    const writes = writesOf(queryClient);

    applyFeedEvents({ queryClient, cacheId: id, fetchRow: never }, events);

    expect(writes()).toBe(1);
    expect(readFeed(queryClient)?.rows).toEqual(rows);
  });

  it('writes a batch of rows once, to the same Feed as the rows one by one', () => {
    const upserts = events.filter((event) => event.type === upsert);

    const batch = upserts.flatMap((event) =>
      event.type === upsert ? [event.row] : [],
    );

    const batched = createQueryClient();

    heldFeed(batched, mergeNewestPage(emptyFeed, page([], 0)));
    const writes = writesOf(batched);

    applyFeedEvents({ queryClient: batched, cacheId: id, fetchRow: never }, [
      {
        type: rowsUpsert,
        rev: Math.max(...batch.map((row) => row.revision)),
        rows: batch,
      },
    ]);

    const single = createQueryClient();

    heldFeed(single, mergeNewestPage(emptyFeed, page([], 0)));
    applyFeedEvents(
      { queryClient: single, cacheId: id, fetchRow: never },
      upserts,
    );

    expect(writes()).toBe(1);
    expect(readFeed(batched)).toEqual(readFeed(single));
  });

  it('leaves rows before a held window out of a batch, as one by one', () => {
    const tail = page(rows, Math.max(...rows.map((row) => row.revision)), {
      limit: 1,
    });

    const batched = createQueryClient();
    const single = createQueryClient();

    heldFeed(batched, mergeNewestPage(emptyFeed, tail));
    heldFeed(single, mergeNewestPage(emptyFeed, tail));
    applyFeedEvents({ queryClient: batched, cacheId: id, fetchRow: never }, [
      { type: rowsUpsert, rev: tail.maxRevision, rows: [...rows] },
    ]);
    applyFeedEvents(
      { queryClient: single, cacheId: id, fetchRow: never },
      rows.map((row) => ({ type: upsert, rev: row.revision, row })),
    );

    expect(tail.hasOlder).toBe(true);
    expect(readFeed(batched)).toEqual(readFeed(single));
  });

  it('keeps a held row whose revision is higher than the one in a batch', () => {
    const queryClient = createQueryClient();
    const [row] = rows;

    if (!row) throw new Error('No streamed rows');
    const newer = { ...row, revision: row.revision + 10 };

    heldFeed(queryClient, mergeNewestPage(emptyFeed, page([newer], 0)));

    applyFeedEvents({ queryClient, cacheId: id, fetchRow: never }, [
      { type: rowsUpsert, rev: row.revision, rows: [row] },
    ]);

    expect(readFeed(queryClient)?.rows).toEqual([newer]);
  });

  it('keeps the snapshot it holds when the next one is equal', () => {
    const queryClient = createQueryClient();
    applyFeedEvents({ queryClient, cacheId: id, fetchRow: never }, [
      { type: 'snapshot', snapshot },
    ]);
    const held = queryClient.getQueryData(snapshotKey(id));

    applyFeedEvents({ queryClient, cacheId: id, fetchRow: never }, [
      { type: 'snapshot', snapshot: { ...snapshot } },
    ]);

    expect(queryClient.getQueryData(snapshotKey(id))).toBe(held);
  });

  it('writes the last snapshot of a frame', () => {
    const queryClient = createQueryClient();

    applyFeedEvents({ queryClient, cacheId: id, fetchRow: never }, [
      { type: 'snapshot', snapshot: { ...snapshot, title: 'A' } },
      { type: 'snapshot', snapshot: { ...snapshot, title: 'B' } },
    ]);

    expect(
      queryClient.getQueryData<typeof snapshot>(snapshotKey(id))?.title,
    ).toBe('B');
  });

  it('drops the rows held on a reset and pages the tail again', async () => {
    const queryClient = createQueryClient();

    const tail = vi.fn<() => Promise<FeedState>>(() =>
      Promise.resolve(
        mergeNewestPage(emptyFeed, { ...page(rows, 9), epoch: 1 }),
      ),
    );

    heldFeed(queryClient, mergeNewestPage(emptyFeed, page(rows, 9)));

    const observer = new QueryObserver(queryClient, {
      queryKey: feedKey(id),
      queryFn: tail,
    });

    const unsubscribe = observer.subscribe(() => {});

    applyFeedEvents({ queryClient, cacheId: id, fetchRow: never }, [
      { type: 'reset', epoch: 1 },
    ]);

    expect(readFeed(queryClient)).toMatchObject({ epoch: 1, rows: [] });
    await vi.waitFor(() => expect(tail).toHaveBeenCalledOnce());
    await vi.waitFor(() =>
      expect(readFeed(queryClient)).toMatchObject({ epoch: 1, rows }),
    );
    unsubscribe();
  });

  it('fetches a row a change cannot apply to whole and merges it', async () => {
    const queryClient = createQueryClient();
    heldFeed(queryClient, mergeNewestPage(emptyFeed, page([], 0)));
    const whole = beforeAppend.rows.find((row) => row.id === append.id);

    if (!whole) throw new Error('Recorded stream needs the appended row');

    const fetchRow = vi.fn<(id: string) => Promise<SessionUpdate>>(() =>
      Promise.resolve(whole),
    );

    applyFeedEvents({ queryClient, cacheId: id, fetchRow: fetchRow }, [append]);

    expect(fetchRow).toHaveBeenCalledWith(append.id);
    await vi.waitFor(() =>
      expect(readFeed(queryClient)?.rows).toEqual([whole]),
    );
  });

  it('keeps the rows it holds when fetching a row whole fails', async () => {
    const queryClient = createQueryClient();
    heldFeed(queryClient, mergeNewestPage(emptyFeed, page([], 0)));

    const fetchRow = vi.fn<(id: string) => Promise<SessionUpdate>>(() =>
      Promise.reject(new Error('Server gone')),
    );

    applyFeedEvents({ queryClient, cacheId: id, fetchRow: fetchRow }, [append]);
    await Promise.resolve();

    expect(readFeed(queryClient)?.rows).toEqual([]);
  });
});

// The checklist keeps the position of its first row (ADR-0007), so in a long Session it sits before the held window.
const todos: PlanUpdate = {
  id: 'todos',
  sessionId: rows[0]?.sessionId ?? 'session',
  turnId: null,
  position: -1,
  revision: snapshot.maxRevision + 1,
  state: 'settled',
  sessionUpdate: 'plan_update',
  plan: {
    type: 'items',
    planId: 'todos',
    entries: [{ content: 'Fix it', priority: 'medium', status: 'completed' }],
  },
  _meta: {
    argo: { removed: false, contentRevision: snapshot.maxRevision + 1 },
  },
};

describe('applyFeedEvents for a checklist before the held rows', () => {
  it('holds a revision of the checklist without moving the start of the window', () => {
    const queryClient = createQueryClient();

    const tail = {
      ...page(rows, snapshot.maxRevision, { limit: 2 }),
      hasOlder: true,
    };

    heldFeed(queryClient, mergeNewestPage(emptyFeed, tail));

    applyFeedEvents({ queryClient, cacheId: id, fetchRow: never }, [
      { type: upsert, row: todos, rev: todos.revision },
    ]);

    expect(readFeed(queryClient)?.plan).toEqual(todos);
    expect(readFeed(queryClient)?.startCursor).toBe(tail.startCursor);
  });
});
