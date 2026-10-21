import type { EventEmitter } from 'node:events';
import type {
  ViewMessage,
  WireNode,
  PluginViewId,
} from '@repo/contracts/plugins/wire';
import { nextRoot } from '@repo/contracts/plugins/wire-patch';

export type ViewEvents = EventEmitter<{ message: [ViewMessage]; close: [] }>;

export interface ViewSnapshot {
  opening: { viewId: PluginViewId };
  root: WireNode | null;
  revision: number;
  workerRevision: number | null;
  refused: boolean;
  events: ViewEvents;
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
