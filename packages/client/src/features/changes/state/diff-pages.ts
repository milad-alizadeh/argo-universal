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

const sameFlags = (kept: FileDiffPages, diff: FileDiffPages): boolean =>
  kept.loading === diff.loading &&
  kept.more === diff.more &&
  kept.loadError === diff.loadError;

const samePages = (kept: FileDiffPages, diff: FileDiffPages): boolean =>
  kept.pages.length === diff.pages.length &&
  kept.pages.every((page, index) => page === diff.pages[index]);

type Diffs = ChangesViewProps['diffs'];

const sameDiff = (kept: FileDiffPages, diff: FileDiffPages): boolean =>
  sameFlags(kept, diff) && samePages(kept, diff);

const keptDiff = (
  last: Diffs,
  path: string,
  diff: FileDiffPages,
): FileDiffPages => {
  const kept = last[path];

  return kept && sameDiff(kept, diff) ? kept : diff;
};

const sameDiffs = (last: Diffs, next: Diffs): boolean =>
  Object.keys(next).length === Object.keys(last).length &&
  Object.entries(next).every(([path, diff]) => last[path] === diff);

/*
 * The last draw's diff for any file whose pages and flags are unchanged, and the last draw's whole object when no
 * file changed, so a page landing for one file leaves every other file's rows, and the list's items, as they were.
 */
export function diffsKeeper(): (diffs: Diffs) => Diffs {
  let last: Diffs = {};

  return (diffs) => {
    const next = Object.fromEntries(
      Object.entries(diffs).map(([path, diff]) => [
        path,
        keptDiff(last, path, diff),
      ]),
    );

    if (!sameDiffs(last, next)) last = next;

    return last;
  };
}
