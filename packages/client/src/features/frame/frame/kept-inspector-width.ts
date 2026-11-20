import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { StoreListeners } from '../../../lib/store-listeners';
import {
  defaultInspector,
  type InspectorWidth,
} from '../scaffold/inspector-width';

// Kept on this Device for every Session and every Server: a pane's width belongs to the window, not to what it shows.
const storageKey = 'inspector-width';

const KeptWidth = z.object({
  width: z.number().positive(),
  contentFloor: z.number().positive().optional(),
});

let kept: InspectorWidth = defaultInspector;

let touched = false;

const listeners = new StoreListeners();

function parsed(stored: string | null): InspectorWidth | null {
  if (stored === null) return null;

  try {
    return KeptWidth.parse(JSON.parse(stored));
  } catch {
    return null;
  }
}

// A drag sends a width per frame; only the latest waiting one is written, after the read.
let waiting: InspectorWidth | null = null;

let writes: Promise<void> | null = null;

// Read once, when the first Frame subscribes; a drag before the read lands wins over it.
function load(): Promise<void> {
  writes ??= AsyncStorage.getItem(storageKey)
    .then((stored) => {
      const width = parsed(stored);

      if (width === null || touched) return;

      kept = width;
      listeners.notify();
    })
    .catch((cause: unknown) =>
      console.error('Could not load the Inspector width', cause),
    );

  return writes;
}

const subscribe = (listener: () => void): (() => void) => {
  void load();

  return listeners.subscribe(listener);
};

function write(): Promise<void> {
  const width = waiting;
  waiting = null;

  return width === null
    ? Promise.resolve()
    : AsyncStorage.setItem(storageKey, JSON.stringify(width));
}

function keep(width: InspectorWidth): void {
  touched = true;
  kept = width;
  listeners.notify();

  const queued = waiting !== null;
  waiting = width;

  if (queued) return;

  writes = load()
    .then(write)
    .catch((cause: unknown) =>
      console.error('Could not keep the Inspector width', cause),
    );
}

const read = (): InspectorWidth => kept;

// The width the person last dragged the Inspector to on this Device, the default until they do.
export function useKeptInspectorWidth(): [
  InspectorWidth,
  (width: InspectorWidth) => void,
] {
  return [useSyncExternalStore(subscribe, read, read), keep];
}
