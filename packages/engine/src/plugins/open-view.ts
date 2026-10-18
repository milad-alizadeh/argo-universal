import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type {
  PluginDispatchInput,
  PluginEvent,
} from '@repo/contracts/plugins/wire';
import { requireViewHandler } from './view-handler';
import type { ViewSnapshot } from './view-messages';

const staleView = 'Plugin view changed; try again';

export type Open = Extract<PluginEvent, { type: 'open' }>;

export type Opening = Omit<Open, 'type' | 'viewId'>;

export interface OpenView extends ViewSnapshot {
  pluginId: string;
  connectionId: string;
  opening: Open;
  watchers: number;
}

export function createOpenView(
  pluginId: string,
  opening: Opening,
  connectionId: string,
): OpenView {
  const events: OpenView['events'] = new EventEmitter();
  events.setMaxListeners(0);

  return {
    pluginId,
    connectionId,
    events,
    opening: { ...opening, type: 'open', viewId: randomUUID() },
    ...blankView(),
  };
}

function blankView(): Pick<
  OpenView,
  'root' | 'revision' | 'workerRevision' | 'watchers'
> {
  return { root: null, revision: 0, workerRevision: null, watchers: 0 };
}

type DispatchTarget = { viewId: string; revision: number };

export function currentDispatch(
  view: OpenView | undefined,
  input: PluginDispatchInput,
): DispatchTarget {
  if (view?.opening.viewId !== input.viewId) throw new Error(staleView);

  return dispatchTarget(view, input);
}

function dispatchTarget(
  view: OpenView,
  input: PluginDispatchInput,
): DispatchTarget {
  if (view.revision !== input.revision) throw new Error(staleView);

  if (view.workerRevision === null) throw new Error(staleView);
  requireViewHandler(view.root, input);

  return { viewId: view.opening.viewId, revision: view.workerRevision };
}

export function dispatchEvent(
  input: PluginDispatchInput,
  target: DispatchTarget & { requestId: string },
): Extract<PluginEvent, { type: 'dispatch' }> {
  return { ...input, ...target, type: 'dispatch' };
}
