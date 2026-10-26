import type {
  SessionComparison,
  SessionSnapshot,
  SessionChangesOutput,
  SessionBranchesOutput,
} from '@repo/contracts';
import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  type ChangesComparison,
  type ChangesViewProps,
} from '#features/changes';
import { useTRPC } from '#features/connection';
import { comparisonInput } from './changes-comparison-input';
import { filesFromPages } from './changes-files-data';
import type { ChangesScope, Query, QueryFailure } from './changes-query-types';
import { useChangesDiffs } from './use-changes-diffs';

type ChangesInput = ChangesScope<ChangesComparison>;

type ChangesData = Omit<
  ChangesViewProps,
  'comparison' | 'onComparisonChange' | 'viewed' | 'onViewedChange'
>;

type FilesQuery = UseInfiniteQueryResult<
  InfiniteData<SessionChangesOutput>,
  QueryFailure
>;

function useFilesQuery(
  input: ChangesInput,
  comparison: SessionComparison,
): FilesQuery {
  const trpc = useTRPC();

  return useInfiniteQuery(
    trpc.session.changes.infiniteQueryOptions(
      // A page holds the Server's page of files; the list asks for the next as its end comes into view.
      { sessionId: input.sessionId, comparison },
      {
        enabled: input.open,
        getNextPageParam: (page) => page.nextCursor ?? undefined,
      },
    ),
  );
}

function useBranchQuery(input: ChangesInput): Query<SessionBranchesOutput> {
  const trpc = useTRPC();

  return useQuery(
    trpc.session.branches.queryOptions(
      { sessionId: input.sessionId },
      { enabled: input.open },
    ),
  );
}

// One request for the next page at a time; the list's end can be reached again while it loads.
function morePages(
  query: FilesQuery,
): Pick<ChangesData, 'moreFiles' | 'onLoadMoreFiles'> {
  return {
    moreFiles: query.hasNextPage,
    onLoadMoreFiles: () => {
      if (!query.isFetchingNextPage) void query.fetchNextPage();
    },
  };
}

const branchNames = (data: SessionBranchesOutput | undefined): string[] =>
  data?.branches.map(({ name }) => name) ?? [];

function branchData(
  branches: Query<SessionBranchesOutput>,
): ChangesViewProps['branches'] {
  return {
    names: branchNames(branches.data),
    loading: branches.isPending,
    loadError: branches.error?.message,
  };
}

export function useChangesData(input: ChangesInput): ChangesData {
  const branches = useBranchQuery(input);
  const comparison = comparisonInput(input.comparison, branches.data);
  const files = useFilesQuery(input, comparison);
  const diffs = useChangesDiffs({ ...input, comparison });

  return {
    ...filesFromPages(files.data?.pages),
    loadError: files.error?.message,
    ...morePages(files),
    ...diffs,
    branches: branchData(branches),
  };
}

type ChangesSource = { snapshot: SessionSnapshot | null; revision: number };

export function useRefreshChanges(
  input: ChangesInput,
  source: ChangesSource,
): void {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { sessionId, open } = input;

  useEffect(() => {
    if (!open) return;
    refreshQueries(trpc, queryClient, sessionId);
  }, [queryClient, trpc, sessionId, open, source.revision, source.snapshot]);
}

function refreshQueries(
  trpc: ReturnType<typeof useTRPC>,
  queryClient: ReturnType<typeof useQueryClient>,
  sessionId: string,
): void {
  void queryClient.invalidateQueries(
    trpc.session.changes.infiniteQueryFilter({ sessionId }),
  );
  void queryClient.invalidateQueries(
    trpc.session.diff.queryFilter({ sessionId }),
  );
}
