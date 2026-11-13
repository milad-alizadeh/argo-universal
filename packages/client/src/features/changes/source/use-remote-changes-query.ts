import type { ChangeFilesPage, SessionDiffOutput } from '@repo/contracts';
import {
  useInfiniteQuery,
  type UseInfiniteQueryResult,
  useQueries,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  ChangesQuery,
  ChangesSource,
  DiffPage,
  DiffPageKey,
  FilesPages,
  Loaded,
} from './changes-source';
import { toDiffPage } from './use-server-changes-query';

/*
 * One PR-backed Change's files and diffs, read from the Plugin that supplied the Change (ADR-0052): its own Operations
 * answer for the PR's repository, base and head, and the Session's Checkout is never asked.
 */
export interface RemoteChange {
  // What tells this Change's reads from another's: its identity, and its head, so a push reads again.
  key: readonly string[];
  // One page of files, the first when there is no cursor yet; rejects with why it could not be read.
  readFiles: (cursor: number | null) => Promise<ChangeFilesPage>;
  // One file's patch; rejects with why it could not be read.
  readDiff: (path: string) => Promise<SessionDiffOutput>;
}

const noBranches: Loaded<{ branches: [] }> = {
  data: { branches: [] },
  pending: false,
};

// A Change has no branches to compare against: it is compared with its own base.
const useNoBranches = (): typeof noBranches => noBranches;

const messageOf = (error: Error | null): string | undefined => error?.message;

// The first page has no cursor yet, and each page after it is named by the one before.
const firstPage = (): number | null => null;

// A refusal is the answer: the limitation shows at once, and a retry is the person's to ask for.
const noRetry = { retry: false } as const;

type FilesRead = UseInfiniteQueryResult<{ pages: ChangeFilesPage[] }, Error>;

const filesOf = (files: FilesRead): FilesPages => ({
  pages: files.data?.pages,
  error: messageOf(files.error),
  more: files.hasNextPage,
  loadMore: () => {
    if (!files.isFetchingNextPage) void files.fetchNextPage();
  },
});

const useFilesRead = (remote: RemoteChange, open: boolean): FilesRead =>
  useInfiniteQuery({
    queryKey: [...remote.key, 'files'],
    queryFn: ({ pageParam }) => remote.readFiles(pageParam),
    initialPageParam: firstPage(),
    getNextPageParam: (page) => page.nextCursor,
    enabled: open,
    ...noRetry,
  });

const useRemoteFiles = (
  remote: RemoteChange,
  query: ChangesQuery,
): FilesPages => filesOf(useFilesRead(remote, query.open));

const loadedOf = (read: {
  data?: DiffPage;
  isPending: boolean;
  error: Error | null;
}): Loaded<DiffPage> => ({
  data: read.data,
  pending: read.isPending,
  error: messageOf(read.error),
});

type DiffQuery = UseQueryOptions<SessionDiffOutput, Error, DiffPage>;

const diffQueryOf =
  (remote: RemoteChange, open: boolean) =>
  ({ path }: DiffPageKey): DiffQuery => ({
    queryKey: [...remote.key, 'diff', path],
    queryFn: () => remote.readDiff(path),
    select: toDiffPage,
    enabled: open,
    ...noRetry,
  });

const useRemoteDiffs = (
  remote: RemoteChange,
  query: ChangesQuery,
  keys: readonly DiffPageKey[],
): Loaded<DiffPage>[] =>
  useQueries({ queries: keys.map(diffQueryOf(remote, query.open)) }).map(
    loadedOf,
  );

const ignore = (): void => {};

// The Plugin's files over its Operations; a Change's own head, not the Checkout's revision, says when they are stale.
export const remoteChanges = (remote: RemoteChange): ChangesSource => ({
  useBranches: useNoBranches,
  useFiles: (query) => useRemoteFiles(remote, query),
  useDiffPages: (query, keys) => useRemoteDiffs(remote, query, keys),
  useRefresh: ignore,
});
