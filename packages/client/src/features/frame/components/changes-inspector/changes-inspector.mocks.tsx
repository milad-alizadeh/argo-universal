import { Sheet, type SheetProps } from '@repo/kit/primitives/overlays/sheet';
import type * as React from 'react';
import type { FileDiff } from '#features/feed';
import { recordedFile } from '../../../../../mocks/feed-edit-mock';
import {
  ChangesInspector,
  type ChangesInspectorProps,
} from './changes-inspector';

export const branchNames = [
  'main',
  'release/2.4',
  'feature/inspector-tabs',
  'fix/diff-scroll',
  'chore/bump-expo',
];

// The short modified file, the one the stories mark Viewed.
export const viewedPath = '/repo/src/feed.ts';

// Recorded edits: a long modified file, a short one, an added file and a deleted one, each at its own path.
export const fewFiles: FileDiff[] = [
  recordedFile('agent-2', 'edit-states'),
  { ...recordedFile('agent-1'), path: viewedPath },
  {
    ...recordedFile('agent-1', 'edit-and-command', 'add'),
    path: '/repo/src/new-file.ts',
  },
  recordedFile('agent-2', 'edit-states', 'delete'),
];

export const manyFileCount = 60;

// One recorded edit under many paths: the same list, only longer.
export const manyFiles: FileDiff[] = Array.from(
  { length: manyFileCount },
  (_, index) => ({
    ...recordedFile('agent-1'),
    path: `/repo/src/module-${index + 1}/index.ts`,
  }),
);

const ignore = (): void => {};

export const changesArgs = {
  comparison: { kind: 'main' },
  mainBranch: 'main',
  branches: { names: branchNames },
  onComparisonChange: ignore,
  files: fewFiles,
  viewed: [viewedPath],
  onViewedChange: ignore,
  expanded: false,
  onExpandedChange: ignore,
  onOpenChange: ignore,
} satisfies ChangesInspectorProps;

const inspectorSheet: Omit<SheetProps, 'children'> = {
  open: true,
  onOpenChange: ignore,
  label: 'Inspector',
  detents: ['medium', 'large'],
  floating: true,
  contentScrolls: true,
};

// The web's Inspector sheet under wide, whose root page Compare Against pushes its branches over.
export function ChangesInspectorSheet(
  props: ChangesInspectorProps,
): React.JSX.Element {
  return (
    <Sheet {...inspectorSheet}>
      <Sheet.Screen name="inspector">
        <ChangesInspector {...props} inSheet />
      </Sheet.Screen>
    </Sheet>
  );
}
