import type { SessionUpdate } from '@repo/contracts';
import { vi } from 'vitest';
import {
  type KeptFeed,
  type KeptFeedSlot,
  type SessionFeedPorts,
  SessionFeedStore,
} from '../../src/features/feed/stores';
import { toFeedView } from '../../src/features/feed/view/to-feed-view';

interface KeptEntry {
  kept?: KeptFeed;
  retainers: number;
  writes: number;
}

// The kept Feeds of one App, by Session.
export interface KeptFeeds {
  slotOf: (sessionId: string) => KeptFeedSlot;
  entryOf: (sessionId: string) => KeptEntry;
}

export function keptFeeds(): KeptFeeds {
  const entries = new Map<string, KeptEntry>();

  const entryOf = (sessionId: string): KeptEntry => {
    const entry = entries.get(sessionId) ?? { retainers: 0, writes: 0 };
    entries.set(sessionId, entry);

    return entry;
  };

  return { slotOf: (sessionId) => slotOf(entryOf(sessionId)), entryOf };
}

const slotOf = (entry: KeptEntry): KeptFeedSlot => ({
  read: () => entry.kept,
  retain: () => {
    entry.retainers += 1;

    return () => {
      entry.retainers -= 1;
    };
  },
  write: (kept) => {
    entry.kept = kept;
    entry.writes += 1;
  },
});

interface RowFetch {
  id: string;
  resolve: (row: SessionUpdate) => void;
  reject: (cause: Error) => void;
}

interface Drives {
  frames: Set<() => void>;
  fetches: RowFetch[];
  resetHistory: ReturnType<typeof vi.fn<() => Promise<void>>>;
}

export interface SessionFeedHarness extends Omit<Drives, 'frames'> {
  store: SessionFeedStore;
  // Draws one frame, committing what is held for it.
  drawFrame: () => void;
  // How many times the store told its subscribers it changed.
  changes: () => number;
}

// A store whose frames, row fetches and history resets the test drives.
export function sessionFeedHarness(
  kept: KeptFeedSlot = keptFeeds().slotOf('session-1'),
): SessionFeedHarness {
  const drives = newDrives();
  const store = new SessionFeedStore(portsOf(kept, drives));
  let changes = 0;
  store.subscribe(() => (changes += 1));

  return {
    store,
    drawFrame: (): void => drawFrame(drives.frames),
    fetches: drives.fetches,
    resetHistory: drives.resetHistory,
    changes: (): number => changes,
  };
}

const newDrives = (): Drives => ({
  frames: new Set(),
  fetches: [],
  resetHistory: vi.fn<() => Promise<void>>(() => Promise.resolve()),
});

const portsOf = (kept: KeptFeedSlot, drives: Drives): SessionFeedPorts => ({
  kept,
  frame: (run) => frameOf(drives.frames, run),
  fetchRow: (id) =>
    new Promise((resolve, reject) =>
      drives.fetches.push({ id, resolve, reject }),
    ),
  resetHistory: drives.resetHistory,
  translate: toFeedView,
});

function frameOf(frames: Set<() => void>, run: () => void): () => void {
  frames.add(run);

  return () => void frames.delete(run);
}

function drawFrame(frames: Set<() => void>): void {
  const due = [...frames];
  frames.clear();

  for (const run of due) run();
}
