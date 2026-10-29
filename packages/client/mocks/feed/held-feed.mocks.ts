import type { SessionUpdate } from '@repo/contracts';
import { vi } from 'vitest';
import {
  type HeldFeed,
  type HeldFeedPorts,
  HeldFeedStore,
  type HeldSlot,
} from '../../src/features/feed/stores';
import { toFeedView } from '../../src/features/feed/view/to-feed-view';

// Held Feeds by Session, as one App keeps them.
export function heldSlots(): (sessionId: string) => HeldSlot {
  const held = new Map<string, HeldFeed>();

  return (sessionId) => ({
    read: () => held.get(sessionId),
    hold: () => () => {},
    write: (value) => void held.set(sessionId, value),
  });
}

interface RowFetch {
  id: string;
  resolve: (row: SessionUpdate) => void;
}

interface Drives {
  frames: Set<() => void>;
  fetches: RowFetch[];
  resetHistory: ReturnType<typeof vi.fn<() => Promise<void>>>;
}

export interface HeldFeedHarness extends Omit<Drives, 'frames'> {
  store: HeldFeedStore;
  // Draws one frame, committing what is held for it.
  drawFrame: () => void;
  // How many times the store told its subscribers it changed.
  changes: () => number;
}

// A store whose frames, row fetches and history resets the test drives.
export function heldFeedHarness(
  held: HeldSlot = heldSlots()('session-1'),
): HeldFeedHarness {
  const drives = newDrives();
  const store = new HeldFeedStore(portsOf(held, drives));
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

const portsOf = (held: HeldSlot, drives: Drives): HeldFeedPorts => ({
  held,
  frame: (run) => frameOf(drives.frames, run),
  fetchRow: (id) =>
    new Promise((resolve) => drives.fetches.push({ id, resolve })),
  resetHistory: drives.resetHistory,
  convert: toFeedView,
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
