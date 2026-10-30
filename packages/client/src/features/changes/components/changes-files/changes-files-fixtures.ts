import type { ChangesViewProps } from '../../view/changes-view-props';

const noop = (): void => {};

const base = {
  comparison: { kind: 'main' } as const,
  mainBranch: 'main',
  branches: { names: ['main'] },
  onComparisonChange: noop,
  onLoadDiff: noop,
  viewed: [],
  onViewedChange: noop,
};

const addedLine = { kind: 'added', number: 1, text: '# Guide' } as const;

// A file the Server reports as moved, with the old path it had.
export const renamedFile = {
  ...base,
  files: [
    {
      path: 'docs/guides/new-name.md',
      oldPath: 'src/old-name.md',
      operation: 'move',
      added: 1,
      removed: 0,
    },
  ],
  diffs: {
    'docs/guides/new-name.md': {
      pages: [[{ header: '@@ -0,0 +1 @@', lines: [addedLine] }]],
    },
  },
} satisfies ChangesViewProps;

// Git reports no line counts for a binary file, so there is no text to draw.
export const binaryFile = {
  ...base,
  files: [
    {
      path: 'assets/logo.png',
      operation: 'modify',
      added: 0,
      removed: 0,
      binary: true,
    },
  ],
  diffs: { 'assets/logo.png': { pages: [[]] } },
} satisfies ChangesViewProps;
