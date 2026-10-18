import { on, type EventEmitter } from 'node:events';
import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';

export type ViewEvents = EventEmitter<{ message: [ViewMessage]; close: [] }>;

export interface ViewSnapshot {
  opening: { viewId: string };
  root: WireNode | null;
  revision: number;
  workerRevision: number | null;
  events: ViewEvents;
}

function nextRoot(
  root: WireNode | null,
  message: ViewMessage,
): WireNode | null {
  if (message.type === 'snapshot') return message.root;

  return root && applyPatch(root, message.ops);
}

export function updateView(
  view: ViewSnapshot,
  message: ViewMessage,
  revision: number,
): void {
  const root = nextRoot(view.root, message);

  if (!root) return;
  view.root = root;
  view.workerRevision = message.revision;
  view.revision = revision;
  view.events.emit('message', currentMessage(view, message));
}

function currentMessage(view: ViewSnapshot, message: ViewMessage): ViewMessage {
  return { ...message, revision: view.revision, viewId: view.opening.viewId };
}

async function* untilAborted<T>(
  source: AsyncIterable<T>,
  signal: AbortSignal,
): AsyncGenerator<T> {
  try {
    yield* source;
  } catch (error) {
    if (!signal.aborted) throw error;
  }
}

export async function* viewMessages(
  view: ViewSnapshot,
  signal: AbortSignal,
): AsyncGenerator<ViewMessage> {
  const stream = on(view.events, 'message', { signal, close: ['close'] });

  try {
    yield* snapshotOf(view);

    for await (const [message] of untilAborted(stream, signal)) yield message;
  } finally {
    await stream.return?.();
  }
}

function snapshotOf(view: ViewSnapshot): ViewMessage[] {
  return view.root
    ? [
        {
          type: 'snapshot',
          revision: view.revision,
          root: view.root,
          viewId: view.opening.viewId,
        },
      ]
    : [];
}
