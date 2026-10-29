import type { MemoryCatalog } from '../../../features/changes/source/memory-changes.mocks';

export const binaryPath =
  '/repo/assets/illustrations/a-very-long-binary-filename-for-the-inspector.png';

export const binaryChanges: MemoryCatalog = {
  files: () => [
    { path: binaryPath, operation: 'modify', added: 0, removed: 0, hunks: [] },
  ],
  mainBranch: 'main',
};
