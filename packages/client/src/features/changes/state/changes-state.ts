import type { ChangesComparison } from '../view/changes-comparison';

// How many pages of each opened file's diff the list has asked for, by path.
export type WantedPages = Readonly<Record<string, number>>;

// What was picked, marked and asked for: all of it belongs to one comparison.
export interface ChangesState {
  comparison: ChangesComparison;
  viewed: readonly string[];
  wanted: WantedPages;
}

export const initialChangesState: ChangesState = {
  comparison: { kind: 'main' },
  viewed: [],
  wanted: {},
};

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

export const markedViewed = (
  state: ChangesState,
  path: string,
  viewed: boolean,
): ChangesState => ({
  ...state,
  viewed: viewed
    ? [...withoutPath(state.viewed, path), path]
    : withoutPath(state.viewed, path),
});

// Asking again for as many pages, or fewer, keeps the state, so a status row can ask on every draw.
export const wantedMore = (
  state: ChangesState,
  path: string,
  pages: number,
): ChangesState =>
  (state.wanted[path] ?? 0) >= pages
    ? state
    : { ...state, wanted: { ...state.wanted, [path]: pages } };
