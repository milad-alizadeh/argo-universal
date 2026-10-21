import type { ChangesInspectorProps } from './changes-inspector';
import {
  branchNames,
  fewFiles,
  manyFiles,
  viewedPath,
} from './changes-inspector.mocks';

// A story supplies the callbacks; a fixture is the comparison, its branches and the Changes it found.
type ChangesInspectorFixture = Omit<
  ChangesInspectorProps,
  | 'onComparisonChange'
  | 'onViewedChange'
  | 'onFileSelect'
  | 'onExpandedChange'
  | 'onOpenChange'
>;

// The Changes of one Checkout against its main branch, one file marked Viewed.
export const aFewChanges = {
  comparison: { kind: 'main' },
  mainBranch: 'main',
  branches: { names: branchNames },
  files: fewFiles,
  viewed: [viewedPath],
  expanded: false,
} satisfies ChangesInspectorFixture;

// Enough Changes that the file list scrolls under the toolbar.
export const manyChanges = {
  ...aFewChanges,
  files: manyFiles,
  viewed: [],
} satisfies ChangesInspectorFixture;

export const noChanges = {
  ...aFewChanges,
  files: [],
  viewed: [],
} satisfies ChangesInspectorFixture;

// The empty state names the comparison in force.
export const noUncommittedChanges = {
  ...noChanges,
  comparison: { kind: 'uncommitted' },
} satisfies ChangesInspectorFixture;

export const changesAgainstABranch = {
  ...aFewChanges,
  comparison: { kind: 'branch', branch: 'release/2.4' },
} satisfies ChangesInspectorFixture;

// Nothing has settled for this comparison yet.
export const loadingChanges = {
  ...aFewChanges,
  files: undefined,
  viewed: [],
} satisfies ChangesInspectorFixture;

export const unloadableChanges = {
  ...loadingChanges,
  loadError: "Git couldn't find main in this Project.",
} satisfies ChangesInspectorFixture;

// The Inspector over the page, at the Stage's width.
export const expandedChanges = {
  ...aFewChanges,
  expanded: true,
} satisfies ChangesInspectorFixture;
