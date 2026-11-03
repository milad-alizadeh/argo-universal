import type { ChangesComparison } from '../view/changes-comparison';
import type { ChangedFile } from '../view/changes-view-props';

// How many pages of each opened file's diff the list has asked for, by path.
export type WantedPages = Readonly<Record<string, number>>;

// What was picked, marked, folded and asked for: all of it belongs to one comparison.
export interface ChangesState {
  comparison: ChangesComparison;
  // The paths marked Viewed, each with a fingerprint of the file as it was then: a later change no longer matches it.
  viewed: Readonly<Record<string, string>>;
  // The paths folded away; every other file shows its diff.
  folded: readonly string[];
  wanted: WantedPages;
}

export const initialChangesState: ChangesState = {
  comparison: { kind: 'main' },
  viewed: {},
  folded: [],
  wanted: {},
};

const fingerprintOf = (file: ChangedFile): string =>
  [file.operation, file.oldPath, file.added, file.removed].join(':');

// One string per distinct comparison; a branch's name cannot be mistaken for a kind.
export const comparisonKey = (comparison: ChangesComparison): string =>
  comparison.kind === 'branch'
    ? `branch:${comparison.branch}`
    : comparison.kind;

// A different comparison starts everything over; the same one keeps it.
export const compared = (
  state: ChangesState,
  comparison: ChangesComparison,
): ChangesState =>
  comparisonKey(comparison) === comparisonKey(state.comparison)
    ? state
    : { ...initialChangesState, comparison };

const withoutPath = (paths: readonly string[], path: string): string[] =>
  paths.filter((value) => value !== path);

// A mark made before the file's fingerprint is known; `refreshed` fills it in from the files loaded.
const unfingerprinted = '';

export const markedViewed = (
  state: ChangesState,
  path: string,
  viewed: boolean,
): ChangesState => {
  const rest = Object.entries(state.viewed).filter(([key]) => key !== path);

  return {
    ...state,
    viewed: Object.fromEntries(
      viewed ? [...rest, [path, unfingerprinted]] : rest,
    ),
  };
};

export const setOpen = (
  state: ChangesState,
  path: string,
  open: boolean,
): ChangesState => ({
  ...state,
  folded: open
    ? withoutPath(state.folded, path)
    : [...withoutPath(state.folded, path), path],
});

const without = (
  state: ChangesState,
  paths: ReadonlySet<string>,
): ChangesState => ({
  ...state,
  viewed: Object.fromEntries(
    Object.entries(state.viewed).filter(([path]) => !paths.has(path)),
  ),
  folded: state.folded.filter((path) => !paths.has(path)),
});

const fingerprinted = (
  state: ChangesState,
  files: readonly ChangedFile[],
): ChangesState => {
  const marks = Object.fromEntries(
    files.flatMap((file) =>
      state.viewed[file.path] === unfingerprinted
        ? [[file.path, fingerprintOf(file)]]
        : [],
    ),
  );

  return Object.keys(marks).length === 0
    ? state
    : { ...state, viewed: { ...state.viewed, ...marks } };
};

const isStale = (state: ChangesState, file: ChangedFile): boolean => {
  const marked = state.viewed[file.path];

  return (
    marked !== undefined &&
    marked !== unfingerprinted &&
    marked !== fingerprintOf(file)
  );
};

// A Viewed file that has changed since is no longer Viewed, and opens again; nothing to change keeps the same state.
export function refreshed(
  state: ChangesState,
  files: readonly ChangedFile[],
): ChangesState {
  const stale = new Set(
    files.flatMap((file) => (isStale(state, file) ? [file.path] : [])),
  );

  const marked = fingerprinted(state, files);

  return stale.size === 0 ? marked : without(marked, stale);
}

// Asking again for as many pages, or fewer, keeps the state, so a row can ask on every draw.
export const wantedMore = (
  state: ChangesState,
  path: string,
  pages: number,
): ChangesState =>
  (state.wanted[path] ?? 0) >= pages
    ? state
    : { ...state, wanted: { ...state.wanted, [path]: pages } };
