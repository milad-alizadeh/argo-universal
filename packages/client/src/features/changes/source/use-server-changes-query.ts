import {
  type SessionBranchesOutput,
  type SessionChangesOutput,
  type SessionDiffInput,
  type SessionDiffOutput,
  sessionDiffPageLines,
} from '@repo/contracts';
import {
  useInfiniteQuery,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { type ClientError, useTRPC } from '#features/connection';
import { toFileDiffs } from '#features/feed';
import type {
  ChangesQuery,
  ChangesScope,
  ChangesSource,
  DiffPage,
  DiffPageKey,
  FilesPages,
  Loaded,
} from './changes-source';
import { ReloadPacer } from './reload-pacer';

type Read<Data> = {
  data?: Data;
  isPending: boolean;
  error: Pick<ClientError, 'message'> | null;
};

const loaded = <Data>(read: Read<Data>): Loaded<Data> => ({
  data: read.data,
  pending: read.isPending,
  error: read.error?.message,
});

function useServerBranches(scope: ChangesScope): Loaded<SessionBranchesOutput> {
  const trpc = useTRPC();

  return loaded(
    useQuery(
      trpc.session.listBranches.queryOptions(
        { sessionId: scope.sessionId },
        { enabled: scope.open },
      ),
    ),
  );
}

type PagesRead = Read<{ pages: SessionChangesOutput[] }> & {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<object>;
};

// One next page at a time: asking again while it loads does nothing.
const pagesOf = (files: PagesRead): FilesPages => ({
  pages: files.data?.pages,
  error: files.error?.message,
  more: files.hasNextPage,
  loadMore: () => {
    if (!files.isFetchingNextPage) void files.fetchNextPage();
  },
});

// A page holds the Server's page of files; the list asks for the next as its end comes into view.
function useServerFiles(query: ChangesQuery): FilesPages {
  const trpc = useTRPC();

  return pagesOf(
    useInfiniteQuery(
      trpc.session.changes.infiniteQueryOptions(
        { sessionId: query.sessionId, comparison: query.comparison },
        {
          enabled: query.open,
          getNextPageParam: (page) => page.nextCursor ?? undefined,
        },
      ),
    ),
  );
}

function toDiffPage(output: SessionDiffOutput): DiffPage {
  const { operation, path, oldPath } = output.file;

  const [file] = toFileDiffs({
    type: 'diff',
    changes: [{ operation, path, oldPath }],
    patch: output.patch,
  });

  return { hunks: file?.hunks ?? [], nextCursor: output.nextCursor };
}

const pageInput = (
  query: ChangesQuery,
  { path, index }: DiffPageKey,
): SessionDiffInput => ({
  sessionId: query.sessionId,
  comparison: query.comparison,
  path,
  cursor: index * sessionDiffPageLines,
  limit: sessionDiffPageLines,
});

function useServerDiffPages(
  query: ChangesQuery,
  keys: readonly DiffPageKey[],
): Loaded<DiffPage>[] {
  const trpc = useTRPC();

  return useQueries({
    queries: keys.map((key) =>
      trpc.session.diff.queryOptions(pageInput(query, key), {
        enabled: query.open,
        select: toDiffPage,
      }),
    ),
  }).map(loaded);
}

type QueryClient = ReturnType<typeof useQueryClient>;

type TRPC = ReturnType<typeof useTRPC>;

// Marks a Session's files and every diff page read stale, and reloads those in use.
const changesReload =
  (queryClient: QueryClient, trpc: TRPC, sessionId: string) =>
  async (): Promise<void> => {
    // A reload already on its way is left to finish: it is answered by the pacer's next one.
    const whole = { cancelRefetch: false };
    const files = trpc.session.changes.infiniteQueryFilter({ sessionId });
    const diffs = trpc.session.diff.queryFilter({ sessionId });

    await Promise.all([
      queryClient.invalidateQueries(files, whole),
      queryClient.invalidateQueries(diffs, whole),
    ]);
  };

// One pacer per Session, stopped when the Session's Changes are let go.
function useReloadPacer(sessionId: string): ReloadPacer {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const pacer = useMemo(
    () => new ReloadPacer(changesReload(queryClient, trpc, sessionId)),
    [queryClient, trpc, sessionId],
  );

  useEffect(() => pacer.stop, [pacer]);

  return pacer;
}

function useServerRefresh({ sessionId, open, revision }: ChangesScope): void {
  const pacer = useReloadPacer(sessionId);

  useEffect(() => {
    if (open) pacer.request();
  }, [pacer, open, revision]);
}

// The Server's Changes over tRPC: the files a page at a time, each opened file's diff a page of lines at a time.
export const serverChanges: ChangesSource = {
  useBranches: useServerBranches,
  useFiles: useServerFiles,
  useDiffPages: useServerDiffPages,
  useRefresh: useServerRefresh,
};
