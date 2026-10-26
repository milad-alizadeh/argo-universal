import type {
  SessionComparison,
  SessionDiffInput,
  SessionDiffOutput,
} from '@repo/contracts';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { ChangesViewProps, FileDiffPages } from '#features/changes';
import { useTRPC, type ClientError } from '#features/connection';
import { type FileDiff, toFileDiffs } from '#features/feed';

// Lines of one file's diff in a page; a long new file arrives a page at a time.
export const diffPageLines = 400;

type DiffsInput = {
  sessionId: string;
  open: boolean;
  comparison: SessionComparison;
};

type DiffPage = { hunks: FileDiff['hunks']; nextCursor: number | null };

type PageResult = UseQueryResult<DiffPage, Pick<ClientError, 'message'>>;

type Wanted = { key: string; pages: Readonly<Record<string, number>> };

type FileDiffs = Pick<ChangesViewProps, 'diffs' | 'onLoadDiff'>;

function diffPage(data: SessionDiffOutput): DiffPage {
  const { operation, path, oldPath } = data.file;

  const [file] = toFileDiffs({
    type: 'diff',
    changes: [{ operation, path, oldPath }],
    patch: data.patch,
  });

  return { hunks: file?.hunks ?? [], nextCursor: data.nextCursor };
}

const pageNumbers = (count: number): number[] =>
  Array.from({ length: count }, (_, page) => page);

type PageKey = { path: string; page: number };

const wantedPages = (wanted: Wanted['pages']): PageKey[] =>
  Object.entries(wanted).flatMap(([path, count]) =>
    pageNumbers(count).map((page) => ({ path, page })),
  );

function useWanted(key: string): [Wanted['pages'], FileDiffs['onLoadDiff']] {
  const [wanted, setWanted] = useState<Wanted>({ key, pages: {} });
  const pages = keyedPages(wanted, key);

  const onLoadDiff = useCallback(
    (path: string, count: number) =>
      setWanted((last) => wantMore(last, key, { path, page: count })),
    [key],
  );

  return [pages, onLoadDiff];
}

// Asking again for as many pages, or fewer, keeps the state, so a status row can ask on every draw.
function wantMore(last: Wanted, key: string, want: PageKey): Wanted {
  const pages = keyedPages(last, key);

  if (pageCount(pages, want.path) >= want.page) return last;

  return { key, pages: { ...pages, [want.path]: want.page } };
}

const keyedPages = (wanted: Wanted, key: string): Wanted['pages'] =>
  wanted.key === key ? wanted.pages : {};

const pageCount = (pages: Wanted['pages'], path: string): number =>
  pages[path] ?? 0;

const pageInput = (
  input: DiffsInput,
  { path, page }: PageKey,
): SessionDiffInput => ({
  sessionId: input.sessionId,
  comparison: input.comparison,
  path,
  cursor: page * diffPageLines,
  limit: diffPageLines,
});

function usePageQueries(input: DiffsInput, keys: PageKey[]): PageResult[] {
  const trpc = useTRPC();

  return useQueries({
    queries: keys.map((key) =>
      trpc.session.diff.queryOptions(pageInput(input, key), {
        enabled: input.open,
        select: diffPage,
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
  const [wanted, onLoadDiff] = useWanted(JSON.stringify(input.comparison));
  const keys = wantedPages(wanted);
  const results = usePageQueries(input, keys);

  return { diffs: byFile(keys, results), onLoadDiff };
}
