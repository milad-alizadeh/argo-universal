import type { ShellOutput } from '@repo/contracts';
import type { ShellOutputSource } from '../components/shell-list/shell-list-types';

export interface ShellOutputBuffer {
  shellId: string;
  text: string;
  after: number;
}

const isForShell = (
  buffer: ShellOutputBuffer | null | undefined,
  shellId: string,
): buffer is ShellOutputBuffer => buffer?.shellId === shellId;

export function appendShellOutput(
  previous: ShellOutputBuffer | null,
  shellId: string,
  chunk: ShellOutput,
): ShellOutputBuffer {
  return {
    shellId,
    text: (isForShell(previous, shellId) ? previous.text : '') + chunk.text,
    after: chunk.after,
  };
}

export function newestShellOutput(
  visible: ShellOutputBuffer | undefined,
  received: ShellOutputBuffer,
): ShellOutputBuffer {
  if (!isForShell(visible, received.shellId)) return received;

  return received.after > visible.after ? received : visible;
}

// The source the output view reads, which the subscription also writes to.
export interface ShellOutputStore extends ShellOutputSource {
  current: () => ShellOutputBuffer | undefined;
  receive: (received: ShellOutputBuffer) => void;
}

interface StoreState {
  shown?: ShellOutputBuffer;
  listeners: Set<() => void>;
}

function receiveInto(state: StoreState, received: ShellOutputBuffer): void {
  const next = newestShellOutput(state.shown, received);

  if (next === state.shown) return;

  state.shown = next;

  for (const listener of state.listeners) listener();
}

// Holds the newest output for its listeners, so a chunk re-renders the output view and not the Session page.
export function createShellOutputStore(): ShellOutputStore {
  const state: StoreState = { listeners: new Set() };

  return {
    current: () => state.shown,
    subscribe: (listener) => {
      state.listeners.add(listener);

      return () => state.listeners.delete(listener);
    },
    receive: (received) => receiveInto(state, received),
  };
}
