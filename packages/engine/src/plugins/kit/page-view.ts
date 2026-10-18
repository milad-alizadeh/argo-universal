import type {
  PluginEvent,
  PluginDispatchResult,
  ViewMessage,
  WireNode,
} from '@repo/contracts/plugins/wire';
import { diff } from './diff';
import type { Mounted } from './reconciler';
import type { Handlers } from './wire-tree';

export type DispatchSender = (
  requestId: string,
  result: PluginDispatchResult,
) => Promise<void>;

export interface OpenView {
  viewId: string;
  mounted?: Mounted;
  tree: WireNode | null;
  revision: number;
  handlers: Handlers;
}

export function nextMessage(view: OpenView, next: WireNode): ViewMessage {
  const revision = view.revision + 1;

  if (!view.tree) return { type: 'snapshot', revision, root: next };
  const ops = diff(view.tree, next);

  return ops.length === 0
    ? { type: 'snapshot', revision, root: next }
    : { type: 'patch', revision, ops };
}

export async function runHandler(
  view: OpenView | undefined,
  event: Extract<PluginEvent, { type: 'dispatch' }>,
): Promise<void> {
  if (!view) throw new Error('Plugin view is no longer available');
  await runCurrentHandler(view, event);
}

async function runCurrentHandler(
  view: OpenView,
  event: Extract<PluginEvent, { type: 'dispatch' }>,
): Promise<void> {
  if (view.revision !== event.revision)
    throw new Error('Plugin view changed; try again');
  const handler = view.handlers.get(JSON.stringify([event.key, event.event]));

  if (!handler) throw new Error('Plugin handler is no longer available');
  await handler(event.payload);
}
