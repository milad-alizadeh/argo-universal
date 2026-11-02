import type { FileDiff } from '#features/feed';
import type { ChangedFile, FileDiffPages } from './changes-view-props';
import { idle, settled } from './diff-pages-state';

/*
 * The Changes list as one flat list, so each file's header can stick to the top while its own diff scrolls under it:
 * a header per file, a separator between files, and under an opened file each loaded page of its diff, then a status
 * row when the load failed or the file has no lines to show. A drawn `more` row, where a file's next page would go,
 * asks for that page: the list draws rows only near the viewport. Headers are always drawn, so they ask for nothing.
 */
export type ChangesItem =
  | { kind: 'separator'; key: string }
  | { kind: 'header'; key: string; file: ChangedFile }
  | { kind: 'page'; key: string; file: ChangedFile; hunks: FileDiff['hunks'] }
  | { kind: 'more'; key: string; file: ChangedFile; nextPages: number }
  | { kind: 'status'; key: string; file: ChangedFile; diff: FileDiffPages };

export type DiffItem = Extract<
  ChangesItem,
  { kind: 'page' | 'more' | 'status' }
>;

// The items under a file's header; the rest are the list's own parts.
export const isDiffItem = (item: ChangesItem): item is DiffItem =>
  item.kind === 'page' || item.kind === 'more' || item.kind === 'status';

export interface ChangesItems {
  items: ChangesItem[];
  // The headers' places in `items`.
  sticky: number[];
  // The headers' keys.
  headers: string[];
}

type Diffs = Readonly<Record<string, FileDiffPages>>;

type Lists = { folded: ReadonlySet<string>; diffs: Diffs };

const hasLines = (diff: FileDiffPages): boolean =>
  diff.pages.some((hunks) => hunks.length > 0);

// A file's diff has something to say below its pages: nothing is said while it loads.
const needsStatus = (diff: FileDiffPages): boolean =>
  diff.loadError !== undefined || (settled(diff) && !hasLines(diff));

const pageItems = (file: ChangedFile, diff: FileDiffPages): ChangesItem[] =>
  diff.pages.map((hunks, page) => ({
    kind: 'page',
    key: `page:${file.path}:${page}`,
    file,
    hunks,
  }));

const moreItems = (file: ChangedFile, diff: FileDiffPages): ChangesItem[] =>
  idle(diff) && diff.more
    ? [
        {
          kind: 'more',
          key: `more:${file.path}`,
          file,
          nextPages: diff.pages.length + 1,
        },
      ]
    : [];

const statusItems = (file: ChangedFile, diff: FileDiffPages): ChangesItem[] =>
  needsStatus(diff)
    ? [{ kind: 'status', key: `status:${file.path}`, file, diff }]
    : [];

// A file not asked for yet holds its place with a `more` row, which asks for its first page.
const firstPageItem = (file: ChangedFile): ChangesItem => ({
  kind: 'more',
  key: `more:${file.path}`,
  file,
  nextPages: 1,
});

const diffItems = (file: ChangedFile, diff?: FileDiffPages): ChangesItem[] =>
  diff
    ? [
        ...pageItems(file, diff),
        ...moreItems(file, diff),
        ...statusItems(file, diff),
      ]
    : [firstPageItem(file)];

export const headerKey = (path: string): string => `header:${path}`;

const separatorBefore = (file: ChangedFile, index: number): ChangesItem[] =>
  index > 0 ? [{ kind: 'separator', key: `separator:${file.path}` }] : [];

const headerItem = (file: ChangedFile): ChangesItem => ({
  kind: 'header',
  key: headerKey(file.path),
  file,
});

const openedItems = (file: ChangedFile, lists: Lists): ChangesItem[] =>
  lists.folded.has(file.path) ? [] : diffItems(file, lists.diffs[file.path]);

const allItems = (files: readonly ChangedFile[], lists: Lists): ChangesItem[] =>
  files.flatMap((file, index): ChangesItem[] => [
    ...separatorBefore(file, index),
    headerItem(file),
    ...openedItems(file, lists),
  ]);

export function changesItems(
  files: readonly ChangedFile[],
  folded: ReadonlySet<string>,
  diffs: Diffs,
): ChangesItems {
  const items = allItems(files, { folded, diffs });

  return {
    items,
    sticky: headerIndices(items),
    headers: files.map((file) => headerKey(file.path)),
  };
}

function sameItem(kept: ChangesItem, item: ChangesItem): boolean {
  const fields = new Map(Object.entries(kept));

  return Object.entries(item).every(
    ([field, value]) => fields.get(field) === value,
  );
}

// The last draw's item for any key whose fields are unchanged, so a diff page landing redraws only its own file's rows.
export function itemKeeper(): (items: ChangesItem[]) => ChangesItem[] {
  let last = new Map<string, ChangesItem>();

  return (items) => {
    const kept = items.map((item) => {
      const previous = last.get(item.key);

      return previous && sameItem(previous, item) ? previous : item;
    });

    last = new Map(kept.map((item) => [item.key, item]));

    return kept;
  };
}

const headerIndices = (items: readonly ChangesItem[]): number[] =>
  items.flatMap((item, index) => (item.kind === 'header' ? [index] : []));

// Some file's diff has a page on its way: the list says so once, at its end.
export const diffsLoading = (diffs: Diffs): boolean =>
  Object.values(diffs).some((diff) => diff.loading);
