import type { ChangesSummary } from '@repo/contracts';
import type { FileDiff } from '#features/feed';
import type { ChangesComparison } from './changes-comparison';

// The branches Compare Against offers.
export interface ChangesBranches {
  names: readonly string[];
  loading?: boolean;
  loadError?: string;
}

// A changed file as its row draws it; its diff loads in pages once the row is opened.
export type ChangedFile = Omit<FileDiff, 'hunks'> & {
  // Git reports no line counts for it, so its diff has no text to draw.
  binary?: boolean;
};

// What has loaded of one file's diff, a page of hunks at a time.
export interface FileDiffPages {
  pages: readonly FileDiff['hunks'][];
  // A page is on its way.
  loading?: boolean;
  // The Server holds more pages after the last one loaded.
  more?: boolean;
  loadError?: string;
}

export interface ChangesViewProps {
  comparison: ChangesComparison;
  // The branch the Project's main checkout has checked out; unknown until the first page of files arrives.
  mainBranch?: string;
  branches: ChangesBranches;
  onComparisonChange: (comparison: ChangesComparison) => void;
  // The pages of changed files loaded so far; undefined until the first page for this comparison settles.
  files?: readonly ChangedFile[];
  // The whole comparison's counts, including the files no page has brought yet.
  summary?: ChangesSummary;
  // More files wait on the Server; the list asks for them as its end comes into view.
  moreFiles?: boolean;
  onLoadMoreFiles?: () => void;
  diffs: Readonly<Record<string, FileDiffPages>>;
  // Asks for a file's diff up to this many pages; asking again for the same count does nothing.
  onLoadDiff: (path: string, pages: number) => void;
  // The last load failed; files from an earlier load stay on screen.
  loadError?: string;
  // The paths marked Viewed.
  viewed: readonly string[];
  onViewedChange: (path: string, viewed: boolean) => void;
}
