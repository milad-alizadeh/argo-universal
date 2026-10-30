import { recordedFile } from '../../../../../mocks/feed-edit-mock';
import type { DiffViewProps } from './diff-view';

// A story supplies the Viewed mark's handler; a fixture is the file and how it is drawn.
type DiffViewFixture = Omit<DiffViewProps, 'onViewedChange'>;

export const inspectorDiff = {
  file: recordedFile('agent-1'),
} satisfies DiffViewFixture;

// Inside a Feed row the same hunks are drawn as a patch, without the file header or the Viewed fold.
export const inlineDiff = {
  file: recordedFile('agent-1'),
  inline: true,
} satisfies DiffViewFixture;

// A moved file, as the Server reports it: where it is now and where it was.
export const movedDiff = {
  file: {
    ...recordedFile('agent-1'),
    operation: 'move',
    path: '/repo/docs/guides/new-name.md',
    oldPath: '/repo/src/old-name.md',
  },
} satisfies DiffViewFixture;
