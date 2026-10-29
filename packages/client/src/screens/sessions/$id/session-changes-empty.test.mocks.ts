import type { MemoryCatalog } from '../../../features/changes/source/memory-changes.mocks';

// A file with no textual diff, such as a binary file.
export const binaryPath =
  '/repo/assets/illustrations/a-very-long-binary-filename-for-the-inspector.png';

export const binaryChanges: MemoryCatalog = {
  files: () => [
    { path: binaryPath, operation: 'modify', added: 0, removed: 0, hunks: [] },
  ],
  mainBranch: 'main',
};
