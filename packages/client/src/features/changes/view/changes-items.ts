import type { FileDiff } from '#features/feed';
import type { ChangedFile, FileDiffPages } from './changes-view-props';
import { settled } from './diff-pages-state';

/*
 * The Changes list as one flat list, so each file's header can stick to the top while its own diff scrolls under it:
 * a header per file, a separator between files, and under an opened file each loaded page of its diff, then a status
 * row while a page loads, more wait, the load failed, or the file has no lines to show.
 */
export type ChangesItem =
  | { kind: 'separator'; key: string }
  | { kind: 'header'; key: string; file: ChangedFile }
  | { kind: 'page'; key: string; file: ChangedFile; hunks: FileDiff['hunks'] }
  | { kind: 'status'; key: string; file: ChangedFile; diff?: FileDiffPages };

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

type Lists = { open: ReadonlySet<string>; diffs: Diffs };

const hasLines = (diff: FileDiffPages): boolean =>
  diff.pages.some((hunks) => hunks.length > 0);

// A file's diff still has something to say below its pages.
const needsStatus = (diff: FileDiffPages | undefined): boolean =>
  !diff || !settled(diff) || !hasLines(diff);

const pageItems = (file: ChangedFile, diff?: FileDiffPages): ChangesItem[] =>
  (diff?.pages ?? []).map((hunks, page) => ({
    kind: 'page',
    key: `page:${file.path}:${page}`,
    file,
    hunks,
  }));

function diffItems(file: ChangedFile, diff?: FileDiffPages): ChangesItem[] {
  const status: ChangesItem = {
    kind: 'status',
    key: `status:${file.path}`,
    file,
    diff,
  };

  return [...pageItems(file, diff), ...(needsStatus(diff) ? [status] : [])];
}

const separatorBefore = (file: ChangedFile, index: number): ChangesItem[] =>
  index > 0 ? [{ kind: 'separator', key: `separator:${file.path}` }] : [];

const openedItems = (file: ChangedFile, lists: Lists): ChangesItem[] =>
  lists.open.has(file.path) ? diffItems(file, lists.diffs[file.path]) : [];

export function changesItems(
  files: readonly ChangedFile[],
  open: ReadonlySet<string>,
  diffs: Diffs,
): ChangesItems {
  const items = files.flatMap((file, index): ChangesItem[] => [
    ...separatorBefore(file, index),
    { kind: 'header', key: `header:${file.path}`, file },
    ...openedItems(file, { open, diffs }),
  ]);

  return { items, sticky: headerIndices(items) };
}

const headerIndices = (items: readonly ChangesItem[]): number[] =>
  items.flatMap((item, index) => (item.kind === 'header' ? [index] : []));
