import type {
  SessionBranchesOutput,
  SessionChangesOutput,
  SessionComparison,
} from '@repo/contracts';
import type { FileDiff } from '#features/feed';

// The Session whose Changes are read, and whether they are on screen: closed, nothing loads.
export interface ChangesScope {
  sessionId: string;
  open: boolean;
  // Changes, by identity, whenever the Checkout may have; each new value reloads the open Changes.
  revision: unknown;
}

// What the files and diffs are read against.
export interface ChangesQuery extends Pick<ChangesScope, 'sessionId' | 'open'> {
  comparison: SessionComparison;
}

// One read, as its answer arrives.
export interface Loaded<Data> {
  data?: Data;
  pending: boolean;
  error?: string;
}

// The pages of changed files read so far; while more wait, `loadMore` asks for the next, one request at a time.
export interface FilesPages {
  pages?: readonly SessionChangesOutput[];
  error?: string;
  more: boolean;
  loadMore: () => void;
}

// One page of one file's diff, by its place among the file's pages.
export interface DiffPageKey {
  path: string;
  index: number;
}

export interface DiffPage {
  hunks: FileDiff['hunks'];
  nextCursor: number | null;
}

/*
 * Where a Session's Changes come from: the Server over tRPC, or an in-memory stand-in in stories. Each member is a
 * hook, called on every draw in the same order.
 */
export interface ChangesSource {
  useBranches: (scope: ChangesScope) => Loaded<SessionBranchesOutput>;
  useFiles: (query: ChangesQuery) => FilesPages;
  // One read per key, in the keys' order.
  useDiffPages: (
    query: ChangesQuery,
    keys: readonly DiffPageKey[],
  ) => Loaded<DiffPage>[];
  // Reloads what is open whenever the scope's revision changes.
  useRefresh: (scope: ChangesScope) => void;
}
