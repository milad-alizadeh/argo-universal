import type { MemoryCatalog } from '../../../features/changes/source/memory-changes.mocks';

export const binaryPath =
  '/repo/assets/illustrations/a-very-long-binary-filename-for-the-inspector.png';

export const binaryChanges: MemoryCatalog = {
  files: () => [
    {
      path: binaryPath,
      operation: 'modify',
      added: 0,
      removed: 0,
      hunks: [],
      binary: true,
    },
  ],
  mainBranch: 'main',
};

export const movedFrom = '/repo/src/old-name.txt';

export const movedTo = '/repo/docs/new-name.txt';

export const renamedChanges: MemoryCatalog = {
  files: () => [
    {
      path: movedTo,
      oldPath: movedFrom,
      operation: 'move',
      added: 0,
      removed: 0,
      hunks: [],
    },
  ],
  mainBranch: 'main',
};

export const deletedTextPath = '/repo/.playwright-mcp/page.yml';

export const deletedBinaryPath = '/repo/.playwright-mcp/page.png';

export const deletedChanges: MemoryCatalog = {
  files: () => [
    {
      path: deletedTextPath,
      operation: 'delete',
      added: 0,
      removed: 0,
      hunks: [],
    },
    {
      path: deletedBinaryPath,
      operation: 'delete',
      added: 0,
      removed: 0,
      hunks: [],
      binary: true,
    },
  ],
  mainBranch: 'main',
};
