import type { FileDiff } from '#features/feed';
import type { ChangedFile, FileDiffPages } from './changes-view-props';
import { idle, settled } from './diff-pages-state';

/*
 * The Changes list as one flat list, so each file's header can stick to the top while its own diff scrolls under it:
 * a header per file, a separator between files, and under an opened file each loaded page of its diff, then a status
 * row when the load failed or the file has no lines to show. A row that is drawn asks for `nextPages`, so a diff loads
 * as its file's header comes near the viewport, and its next page as its last page does.
 */
export type ChangesItem =
  | { kind: 'separator'; key: string }
  | { kind: 'header'; key: string; file: ChangedFile; nextPages?: number }
  | {
      kind: 'page';
      key: string;
      file: ChangedFile;
      hunks: FileDiff['hunks'];
      nextPages?: number;
    }
  | { kind: 'status'; key: string; file: ChangedFile; diff: FileDiffPages };

export type DiffItem = Extract<ChangesItem, { kind: 'page' | 'status' }>;

// The items under a file's header; the rest are the list's own parts.
export const isDiffItem = (item: ChangesItem): item is DiffItem =>
  item.kind === 'page' || item.kind === 'status';

export interface ChangesItems {
  items: ChangesItem[];
  // The headers' places in `items`.
  sticky: number[];
}

type Diffs = Readonly<Record<string, FileDiffPages>>;

type Lists = { folded: ReadonlySet<string>; diffs: Diffs };

const hasLines = (diff: FileDiffPages): boolean =>
  diff.pages.some((hunks) => hunks.length > 0);

// A file's diff has something to say below its pages: nothing is said while it loads.
const needsStatus = (diff: FileDiffPages): boolean =>
  diff.loadError !== undefined || (settled(diff) && !hasLines(diff));

const morePages = (diff: FileDiffPages): number | undefined =>
  idle(diff) && diff.more ? diff.pages.length + 1 : undefined;

const pageItems = (file: ChangedFile, diff: FileDiffPages): ChangesItem[] =>
  diff.pages.map((hunks, page) => ({
    kind: 'page',
    key: `page:${file.path}:${page}`,
    file,
    hunks,
    nextPages: page === diff.pages.length - 1 ? morePages(diff) : undefined,
  }));

function diffItems(file: ChangedFile, diff?: FileDiffPages): ChangesItem[] {
  if (!diff) return [];

  const status: ChangesItem = {
    kind: 'status',
    key: `status:${file.path}`,
    file,
    diff,
  };

  return [...pageItems(file, diff), ...(needsStatus(diff) ? [status] : [])];
}

export const headerKey = (path: string): string => `header:${path}`;

const separatorBefore = (file: ChangedFile, index: number): ChangesItem[] =>
  index > 0 ? [{ kind: 'separator', key: `separator:${file.path}` }] : [];

const isUnasked = ({ path }: ChangedFile, lists: Lists): boolean =>
  !lists.folded.has(path) && !lists.diffs[path];

const headerItem = (file: ChangedFile, lists: Lists): ChangesItem => ({
  kind: 'header',
  key: headerKey(file.path),
  file,
  nextPages: isUnasked(file, lists) ? 1 : undefined,
});

const openedItems = (file: ChangedFile, lists: Lists): ChangesItem[] =>
  lists.folded.has(file.path) ? [] : diffItems(file, lists.diffs[file.path]);

export function changesItems(
  files: readonly ChangedFile[],
  folded: ReadonlySet<string>,
  diffs: Diffs,
): ChangesItems {
  const items = files.flatMap((file, index): ChangesItem[] => [
    ...separatorBefore(file, index),
    headerItem(file, { folded, diffs }),
    ...openedItems(file, { folded, diffs }),
  ]);

  return { items, sticky: headerIndices(items) };
}

const headerIndices = (items: readonly ChangesItem[]): number[] =>
  items.flatMap((item, index) => (item.kind === 'header' ? [index] : []));

// Some file's diff has a page on its way: the list says so once, at its end.
export const diffsLoading = (diffs: Diffs): boolean =>
  Object.values(diffs).some((diff) => diff.loading);
