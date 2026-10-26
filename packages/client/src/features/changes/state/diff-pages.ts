import type { DiffPage, DiffPageKey, Loaded } from '../source/changes-source';
import type {
  ChangesViewProps,
  FileDiffPages,
} from '../view/changes-view-props';
import type { WantedPages } from './changes-state';

type PageRead = Loaded<DiffPage>;

const pageIndexes = (count: number): number[] =>
  Array.from({ length: count }, (_, index) => index);

// Every page the list has asked for, file by file, each file's pages in order.
export const wantedPageKeys = (wanted: WantedPages): DiffPageKey[] =>
  Object.entries(wanted).flatMap(([path, count]) =>
    pageIndexes(count).map((index) => ({ path, index })),
  );

// The loaded pages run from the first up to the first that has not arrived.
function loadedPages(reads: readonly PageRead[]): DiffPage[] {
  const missing = reads.findIndex((read) => !read.data);
  const loaded = missing === -1 ? reads : reads.slice(0, missing);

  return loaded.flatMap((read) => (read.data ? [read.data] : []));
}

const hasMore = (pages: readonly DiffPage[]): boolean =>
  typeof pages.at(-1)?.nextCursor === 'number';

const firstError = (reads: readonly PageRead[]): string | undefined =>
  reads.find((read) => read.error !== undefined)?.error;

function filePages(reads: readonly PageRead[]): FileDiffPages {
  const pages = loadedPages(reads);

  return {
    pages: pages.map((page) => page.hunks),
    loading: reads.some((read) => read.pending),
    more: hasMore(pages),
    loadError: firstError(reads),
  };
}

// Each asked-for file's diff, from the reads of its pages, which arrive in the keys' order.
export function diffsByFile(
  keys: readonly DiffPageKey[],
  reads: readonly PageRead[],
): ChangesViewProps['diffs'] {
  const files = Map.groupBy(
    keys.map((key, index) => ({ ...key, read: reads[index] })),
    (entry) => entry.path,
  );

  return Object.fromEntries(
    [...files].map(([path, entries]) => [
      path,
      filePages(entries.flatMap(({ read }) => (read ? [read] : []))),
    ]),
  );
}
