import {
  type SessionComparison,
  type SessionDiffInput,
  type SessionDiffOutput,
  sessionDiffPageLines,
} from '@repo/contracts';
import { useQueries } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  type ChangesViewProps,
  type FileDiffPages,
  useComparisonState,
} from '#features/changes';
import { useTRPC } from '#features/connection';
import { type FileDiff, toFileDiffs } from '#features/feed';
import type { ChangesScope, Query } from './changes-query-types';

type DiffsInput = ChangesScope<SessionComparison>;

type DiffPage = { hunks: FileDiff['hunks']; nextCursor: number | null };

type PageResult = Query<DiffPage>;

// How many pages of each opened file's diff the list has asked for, by path.
type Wanted = Readonly<Record<string, number>>;

type FileDiffs = Pick<ChangesViewProps, 'diffs' | 'onLoadDiff'>;

function toDiffPage(output: SessionDiffOutput): DiffPage {
  const { operation, path, oldPath } = output.file;

  const [file] = toFileDiffs({
    type: 'diff',
    changes: [{ operation, path, oldPath }],
    patch: output.patch,
  });

  return { hunks: file?.hunks ?? [], nextCursor: output.nextCursor };
}

const pageIndexes = (count: number): number[] =>
  Array.from({ length: count }, (_, index) => index);

// One page of one file's diff, by its place among the file's pages.
type PageKey = { path: string; index: number };

const wantedPages = (wanted: Wanted): PageKey[] =>
  Object.entries(wanted).flatMap(([path, count]) =>
    pageIndexes(count).map((index) => ({ path, index })),
  );

const noPages: Wanted = {};

function useWanted(
  comparison: SessionComparison,
): [Wanted, FileDiffs['onLoadDiff']] {
  const [wanted, update] = useComparisonState(comparison, noPages);

  const onLoadDiff = useCallback(
    (path: string, count: number) =>
      update((last) => wantMore(last, path, count)),
    [update],
  );

  return [wanted, onLoadDiff];
}

// Asking again for as many pages, or fewer, keeps the state, so a status row can ask on every draw.
const wantMore = (last: Wanted, path: string, count: number): Wanted =>
  (last[path] ?? 0) >= count ? last : { ...last, [path]: count };

const pageInput = (
  input: DiffsInput,
  { path, index }: PageKey,
): SessionDiffInput => ({
  sessionId: input.sessionId,
  comparison: input.comparison,
  path,
  cursor: index * sessionDiffPageLines,
  limit: sessionDiffPageLines,
});

function usePageQueries(input: DiffsInput, keys: PageKey[]): PageResult[] {
  const trpc = useTRPC();

  return useQueries({
    queries: keys.map((key) =>
      trpc.session.diff.queryOptions(pageInput(input, key), {
        enabled: input.open,
        select: toDiffPage,
      }),
    ),
  });
}

// The loaded pages run from the first up to the first that has not arrived.
function loadedPages(results: PageResult[]): DiffPage[] {
  const missing = results.findIndex((result) => !result.data);
  const loaded = missing === -1 ? results : results.slice(0, missing);

  return loaded.flatMap((result) => (result.data ? [result.data] : []));
}

const hasMore = (pages: DiffPage[]): boolean =>
  typeof pages.at(-1)?.nextCursor === 'number';

const firstError = (results: PageResult[]): string | undefined =>
  results.find((result) => result.error)?.error?.message;

function filePages(results: PageResult[]): FileDiffPages {
  const pages = loadedPages(results);

  return {
    pages: pages.map((page) => page.hunks),
    loading: results.some((result) => result.isPending),
    more: hasMore(pages),
    loadError: firstError(results),
  };
}

function byFile(
  keys: PageKey[],
  results: PageResult[],
): ChangesViewProps['diffs'] {
  const files = Map.groupBy(
    keys.map((key, index) => ({ ...key, result: results[index] })),
    (entry) => entry.path,
  );

  return Object.fromEntries(
    [...files].map(([path, entries]) => [
      path,
      filePages(entries.flatMap(({ result }) => (result ? [result] : []))),
    ]),
  );
}

/*
 * Each opened file's diff, a page of lines at a time: the list asks for a file's next page as the end of what has
 * loaded comes into view. A new comparison starts every file over.
 */
export function useChangesDiffs(input: DiffsInput): FileDiffs {
  const [wanted, onLoadDiff] = useWanted(input.comparison);
  const keys = wantedPages(wanted);
  const results = usePageQueries(input, keys);

  return { diffs: byFile(keys, results), onLoadDiff };
}
