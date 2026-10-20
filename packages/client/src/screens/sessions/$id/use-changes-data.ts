import type {
  SessionDiffOutput,
  SessionSnapshot,
  SessionChangesOutput,
  SessionBranchesOutput,
} from '@repo/contracts';
import {
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import type { ChangesComparison, ChangesViewProps } from '#features/changes';
import { useTRPC, type ClientError } from '#features/connection';
import { toFileDiffs } from '#features/feed';
import { comparisonInput } from './changes-comparison-input';

type ChangesInput = {
  sessionId: string;
  open: boolean;
  comparison: ChangesComparison;
  branches?: SessionBranchesOutput;
};

type ChangesData = Pick<
  ChangesViewProps,
  'files' | 'loadError' | 'branches' | 'mainBranch'
>;

type Query<T> = UseQueryResult<T, Pick<ClientError, 'message'>>;

type DiffResult = Query<SessionDiffOutput>;

function diffFiles(diffs: DiffResult[]): ChangesViewProps['files'] {
  if (diffs.length > 0 && !diffs.some((diff) => diff.data)) return undefined;

  return diffs.flatMap(({ data }) =>
    data
      ? toFileDiffs({ type: 'diff', changes: [data.file], patch: data.patch })
      : [],
  );
}

function useDiffs(input: ChangesInput, paths: string[]): DiffResult[] {
  const trpc = useTRPC();
  const comparison = comparisonInput(input.comparison, input.branches);

  return useQueries({
    queries: paths.map((path) =>
      trpc.session.diff.queryOptions(
        { sessionId: input.sessionId, comparison, path },
        { enabled: input.open },
      ),
    ),
  });
}

function useFileQuery(input: ChangesInput): Query<SessionChangesOutput> {
  const trpc = useTRPC();

  const query = {
    sessionId: input.sessionId,
    comparison: comparisonInput(input.comparison, input.branches),
  };

  return useQuery(
    trpc.session.changes.queryOptions(query, { enabled: input.open }),
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

type Queries = {
  files: Query<SessionChangesOutput>;
  branches: Query<SessionBranchesOutput>;
  diffs: DiffResult[];
};

function useChangesQueries(input: ChangesInput): Queries {
  const branches = useBranchQuery(input);
  const selected = { ...input, branches: branches.data };
  const files = useFileQuery(selected);
  const paths = files.data?.files.map(({ path }) => path) ?? [];
  const diffs = useDiffs(selected, paths);

  return { files, branches, diffs };
}

function changesData({ files, branches, diffs }: Queries): ChangesData {
  return {
    files: files.data && diffFiles(diffs),
    mainBranch: mainBranch(files.data),
    loadError: loadError(files, diffs),
    branches: branchData(branches),
  };
}

const mainBranch = (data: SessionChangesOutput | undefined): string =>
  data?.mainBranch ?? '…';

function loadError(
  files: Queries['files'],
  diffs: DiffResult[],
): string | undefined {
  const error = files.error ?? firstDiffError(diffs);

  return error?.message;
}

const firstDiffError = (
  diffs: DiffResult[],
): Pick<ClientError, 'message'> | null =>
  diffs.find((diff) => diff.error)?.error ?? null;

const branchNames = (data: SessionBranchesOutput | undefined): string[] =>
  data?.branches.map(({ name }) => name) ?? [];

function branchData(
  branches: Queries['branches'],
): ChangesViewProps['branches'] {
  return {
    names: branchNames(branches.data),
    loading: branches.isPending,
    loadError: branches.error?.message,
  };
}

export function useChangesData(input: ChangesInput): ChangesData {
  return changesData(useChangesQueries(input));
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
    trpc.session.changes.queryFilter({ sessionId }),
  );
  void queryClient.invalidateQueries(
    trpc.session.diff.queryFilter({ sessionId }),
  );
}
