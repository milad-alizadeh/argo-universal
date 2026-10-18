import { handlerPath } from '@repo/contracts/plugins/action-handler-path';
import type {
  PluginEvent,
  PluginViewId,
  PluginDispatchId,
  PluginDispatchResult,
  ViewMessage,
  WireNode,
} from '@repo/contracts/plugins/wire';
import { diff } from './diff';
import type { Mounted } from './reconciler';
import type { Handlers } from './wire-tree';

export type DispatchSender = (
  requestId: PluginDispatchId,
  result: PluginDispatchResult,
) => Promise<void>;

export interface OpenView {
  viewId: PluginViewId;
  mounted?: Mounted;
  broken?: boolean;
  replaceable?: boolean;
  frame: ReturnType<typeof setTimeout> | undefined;
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
  requireCurrentRevision(view, event.revision);

  const handler = view.handlers.get(
    JSON.stringify([event.key, ...handlerPath(event)]),
  );

  if (!handler) throw new Error('Plugin handler is no longer available');
  await handler(
    event.event === 'onAction' ? event.payload.value : event.payload,
  );
}

function requireCurrentRevision(view: OpenView, revision: number): void {
  if (view.revision !== revision || view.frame !== undefined)
    throw new Error('Plugin view changed; try again');
}
