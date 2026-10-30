import type { ChangesSummary } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import { type JSX, useState, useSyncExternalStore } from 'react';
import type { ChangesSource } from '#features/changes';
import type { FileDiff } from '#features/feed';
import {
  type MemoryCatalog,
  memoryChanges,
} from '../../../features/changes/source/memory-changes.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { idleSession } from './session-detail-view.mocks';
import { useChangedSession } from './use-session-changes';

// A file the Turn has edited, with the line counts every Changes surface must report for it.
const edited = (path: string, added: number, removed: number): FileDiff => ({
  path,
  operation: 'modify',
  hunks: [],
  added,
  removed,
});

/*
 * What the Checkout holds as the Turn opens, and what it holds once the Agent has edited more. The second reading
 * is the one the Inspector refetches and the snapshot the Feed carries does not (#1480).
 */
const firstReading: readonly FileDiff[] = [edited('/repo/src/feed.ts', 3, 1)];

const laterReading: readonly FileDiff[] = [
  ...firstReading,
  edited('/repo/src/changes.ts', 10, 2),
  edited('/repo/src/workbench.ts', 4, 0),
];

// The counts the assertions name, checked here against the catalog rather than recomputed beside them.
export const firstTotals: ChangesSummary = {
  files: 1,
  additions: 3,
  deletions: 1,
};

export const laterTotals: ChangesSummary = {
  files: 3,
  additions: 17,
  deletions: 3,
};

const totalsOf = (files: readonly FileDiff[]): ChangesSummary => ({
  files: files.length,
  additions: files.reduce((sum, file) => sum + file.added, 0),
  deletions: files.reduce((sum, file) => sum + file.removed, 0),
});

const holds = (files: readonly FileDiff[], totals: ChangesSummary): boolean =>
  JSON.stringify(totalsOf(files)) === JSON.stringify(totals);

if (!holds(firstReading, firstTotals) || !holds(laterReading, laterTotals))
  throw new Error('Recorded catalog needs the totals the assertions name');

// The Checkout as the Server would read it now, and the tests that move the Turn on.
let reading = firstReading;

const readers = new Set<() => void>();

const read = (files: readonly FileDiff[]): void => {
  reading = files;

  for (const redraw of readers) redraw();
};

export const turnStarted = (): void => read(firstReading);

export const moreFilesEdited = (): void => read(laterReading);

const watchReading = (redraw: () => void): (() => void) => {
  readers.add(redraw);

  return (): void => void readers.delete(redraw);
};

const catalog: MemoryCatalog = {
  files: () => reading,
  mainBranch: 'main',
  branches: ['main'],
};

/*
 * A Server that answers only what the page asks for. The shared in-memory source hands over a comparison's first
 * page whether the Changes are open or not, which would hide whether the page asked for them at all.
 */
const whenAsked = (source: ChangesSource): ChangesSource => ({
  ...source,
  useFiles: (query) => {
    const files = source.useFiles(query);

    return query.open ? files : { more: false, loadMore: (): void => {} };
  },
});

const openSession: SessionDetailViewProps = { state: 'open', ...idleSession };

const recorded = recordedFeedMocks.find(
  (mock) => mock.agent === 'agent-2' && mock.recording === 'markdown-answer',
);

if (!recorded)
  throw new Error('Recorded catalog needs agent-2/markdown-answer');

// The snapshot a running Turn leaves behind: its totals are the Checkout as the Turn found it, and they stay there.
const staleFeed = {
  snapshot: { ...recorded.snapshot, changes: firstTotals },
  revision: 1,
};

/*
 * The Session page over an in-memory Server, through the real `useChangedSession`: the Checkout changes under a
 * Turn whose snapshot keeps the totals it started with.
 */
export function LiveChangedSession(): JSX.Element {
  useSyncExternalStore(watchReading, () => reading);
  const [source] = useState(() => whenAsked(memoryChanges(catalog)));

  return (
    <FramedSessionPreview
      {...useChangedSession({
        sessionId: 'memory-session',
        props: openSession,
        feed: staleFeed,
        source,
      })}
    />
  );
}
