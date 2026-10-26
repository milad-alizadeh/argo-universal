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
import { useEffect } from 'react';
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
      trpc.session.branches.queryOptions(
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

function useServerRefresh({ sessionId, open, revision }: ChangesScope): void {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;

    void queryClient.invalidateQueries(
      trpc.session.changes.infiniteQueryFilter({ sessionId }),
    );
    void queryClient.invalidateQueries(
      trpc.session.diff.queryFilter({ sessionId }),
    );
  }, [queryClient, trpc, sessionId, open, revision]);
}

// The Server's Changes over tRPC: the files a page at a time, each opened file's diff a page of lines at a time.
export const serverChanges: ChangesSource = {
  useBranches: useServerBranches,
  useFiles: useServerFiles,
  useDiffPages: useServerDiffPages,
  useRefresh: useServerRefresh,
};
