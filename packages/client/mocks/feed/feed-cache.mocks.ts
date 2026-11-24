import type { FeedPageOutput, SessionUpdate } from '@repo/contracts';
import type { QueryClient } from '@tanstack/react-query';
import {
  FeedCache,
  type FeedCachePorts,
  type FeedPageCursor,
} from '../../src/features/feed/api/feed-cache';
import { createQueryClient } from '../../src/query-cache';

interface RowFetch {
  id: string;
  resolve: (row: SessionUpdate) => void;
  reject: (cause: Error) => void;
}

interface Drives {
  frames: Set<() => void>;
  fetches: RowFetch[];
  pageReads: FeedPageCursor[];
  pages: Map<FeedPageCursor['direction'], FeedPageOutput>;
}

export interface FeedCacheHarness {
  queryClient: QueryClient;
  cache: FeedCache;
  // Draws one frame, writing what the cache gathered for it.
  drawFrame: () => void;
  fetches: RowFetch[];
  // Every `feed.page` read the cache asked for.
  pageReads: FeedPageCursor[];
  // What `feed.page` answers next, by direction.
  answer: (
    direction: FeedPageCursor['direction'],
    page: FeedPageOutput,
  ) => void;
  // How many times the Feed's query was written.
  feedWrites: () => number;
}

// A Session's Feed cache on a real QueryClient, whose frames, row fetches and page reads the test drives. Pass a client to open the same Session again on an App that has seen it.
export function feedCacheHarness(
  queryClient: QueryClient = createQueryClient(),
  cacheId = 'session-1',
): FeedCacheHarness {
  const drives: Drives = {
    frames: new Set(),
    fetches: [],
    pageReads: [],
    pages: new Map(),
  };

  const cache = new FeedCache(queryClient, cacheId, portsOf(drives));

  let writes = 0;

  queryClient.getQueryCache().subscribe((event) => {
    if (
      event.type === 'updated' &&
      event.action.type === 'success' &&
      event.query.queryHash === JSON.stringify(cache.key)
    )
      writes += 1;
  });

  return {
    queryClient,
    cache,
    drawFrame: (): void => drawFrame(drives.frames),
    fetches: drives.fetches,
    pageReads: drives.pageReads,
    answer: (direction, page): void => void drives.pages.set(direction, page),
    feedWrites: (): number => writes,
  };
}

const portsOf = (drives: Drives): FeedCachePorts => ({
  frame: (run) => frameOf(drives.frames, run),
  fetchPage: (cursor) => {
    drives.pageReads.push(cursor);
    const page = drives.pages.get(cursor.direction);

    return page
      ? Promise.resolve(page)
      : Promise.reject(new Error('No page answered'));
  },
  fetchRow: (id) =>
    new Promise((resolve, reject) =>
      drives.fetches.push({ id, resolve, reject }),
    ),
});

function frameOf(frames: Set<() => void>, run: () => void): () => void {
  frames.add(run);

  return () => void frames.delete(run);
}

function drawFrame(frames: Set<() => void>): void {
  const due = [...frames];
  frames.clear();

  for (const run of due) run();
}
