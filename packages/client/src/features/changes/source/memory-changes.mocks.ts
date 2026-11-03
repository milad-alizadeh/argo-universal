import {
  type SessionBranchesOutput,
  type SessionComparison,
  sessionDiffPageLines,
} from '@repo/contracts';
import { useEffect, useMemo, useState } from 'react';
import type {
  ChangesQuery,
  ChangesSource,
  DiffPage,
  DiffPageKey,
  FilesPages,
  Loaded,
} from './changes-source';
import {
  type MemoryCatalog,
  memoryDiffPage,
  memoryFilesPage,
} from './memory-pages.mocks';
import { type Paging, usePaging } from './memory-paging.mocks';

export type { MemoryCatalog } from './memory-pages.mocks';

const listOf = (comparison: SessionComparison, path = ''): string =>
  `${JSON.stringify(comparison)}:${path}`;

const ignore = (): void => {};

const unanswered: FilesPages = { more: false, loadMore: ignore };

function filesPages(
  catalog: MemoryCatalog,
  files: NonNullable<ReturnType<MemoryCatalog['files']>>,
  count: number,
): Omit<FilesPages, 'loadMore'> {
  const pages = Array.from({ length: count }, (_, index) =>
    memoryFilesPage(files, index, catalog),
  );

  return {
    pages,
    error: catalog.loadError,
    more: typeof pages.at(-1)?.nextCursor === 'number',
  };
}

// Like a query's data, the pages keep one identity until another arrives.
const usePagesOnce = (
  catalog: MemoryCatalog,
  files: ReturnType<MemoryCatalog['files']>,
  count: number,
): Omit<FilesPages, 'loadMore'> | undefined =>
  useMemo(
    () => files && filesPages(catalog, files, count),
    [catalog, files, count],
  );

// The first page of a comparison's files is there at once; each later page arrives as the list asks for it.
function useMemoryFiles(
  catalog: MemoryCatalog,
  query: ChangesQuery,
): FilesPages {
  const paging = usePaging();
  const files = catalog.files(query.comparison);
  const list = listOf(query.comparison);
  const count = paging.answered[list] ?? 1;
  const pages = usePagesOnce(catalog, files, count);

  if (!pages) return { ...unanswered, error: catalog.loadError };

  return { ...pages, loadMore: () => paging.ask(list, count + 1) };
}

function diffPage(
  catalog: MemoryCatalog,
  query: ChangesQuery,
  { path, index }: DiffPageKey,
): DiffPage {
  const file = catalog
    .files(query.comparison)
    ?.find((changed) => changed.path === path);

  const lines = catalog.linesPerPage ?? sessionDiffPageLines;

  return memoryDiffPage(file, index, lines);
}

const answeredOf = (
  paging: Paging,
  query: ChangesQuery,
  key: DiffPageKey,
): number => paging.answered[listOf(query.comparison, key.path)] ?? 0;

// The pages the list wants of each file, by list; none while the Changes are closed.
const wantedCounts = (
  query: ChangesQuery,
  keys: readonly DiffPageKey[],
): [string, number][] =>
  query.open
    ? keys.map((key) => [listOf(query.comparison, key.path), key.index + 1])
    : [];

// Asks once each draw is done, so asking never sets state while drawing.
function useAsking(paging: Paging, wanted: [string, number][]): void {
  useEffect(() => {
    for (const [list, pages] of wanted) paging.ask(list, pages);
  });
}

// Like a query's data, a page keeps one identity once it has arrived.
function useDiffPageOnce(
  catalog: MemoryCatalog,
  query: ChangesQuery,
): (key: DiffPageKey) => DiffPage {
  const [arrived] = useState(() => new Map<string, DiffPage>());

  return (key) => {
    const id = `${listOf(query.comparison, key.path)}:${key.index}`;
    const page = arrived.get(id) ?? diffPage(catalog, query, key);

    arrived.set(id, page);

    return page;
  };
}

function useMemoryDiffPages(
  catalog: MemoryCatalog,
  query: ChangesQuery,
  keys: readonly DiffPageKey[],
): Loaded<DiffPage>[] {
  const paging = usePaging();
  const pageOf = useDiffPageOnce(catalog, query);

  useAsking(paging, wantedCounts(query, keys));

  return keys.map((key) =>
    key.index < answeredOf(paging, query, key)
      ? { data: pageOf(key), pending: false }
      : { pending: true },
  );
}

const branchesOf = (catalog: MemoryCatalog): SessionBranchesOutput => ({
  branches: (catalog.branches ?? []).map((name) => ({ name, ref: name })),
});

/*
 * A stand-in for the Server that holds a catalog in memory: the files arrive a page at a time, and each opened file's
 * diff a page of lines at a time, a moment after the list asks. A comparison's first page of files is there at once,
 * open or not; no diff page is asked for while the Changes are closed.
 */
export function memoryChanges(catalog: MemoryCatalog): ChangesSource {
  return {
    useBranches: () => ({ data: branchesOf(catalog), pending: false }),
    useFiles: (query) => useMemoryFiles(catalog, query),
    useDiffPages: (query, keys) => useMemoryDiffPages(catalog, query, keys),
    useRefresh: ignore,
  };
}
