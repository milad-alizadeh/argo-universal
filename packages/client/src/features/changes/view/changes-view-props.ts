import type { FileDiff } from '#features/feed';
import type { ChangesComparison } from './changes-comparison';

// The branches Compare Against offers.
export interface ChangesBranches {
  names: readonly string[];
  loading?: boolean;
  loadError?: string;
}

export interface ChangesViewProps {
  // Desktop Stage navigation; phone file changes retain their inline diffs.
  selectedFile?: string;
  onFileSelect?: (path?: string) => void;
  comparison: ChangesComparison;
  // The branch the Project's main checkout has checked out.
  mainBranch: string;
  branches: ChangesBranches;
  onComparisonChange: (comparison: ChangesComparison) => void;
  // Undefined until the first load for this comparison settles.
  files?: readonly FileDiff[];
  // The last load failed; files from an earlier load stay on screen.
  loadError?: string;
  // The paths marked Viewed.
  viewed: readonly string[];
  onViewedChange: (path: string, viewed: boolean) => void;
}
