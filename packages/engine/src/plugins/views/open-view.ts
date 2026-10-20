import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import {
  type PluginDispatchInput,
  PluginViewId,
  type PluginDispatchId,
  type PluginEvent,
} from '@repo/contracts/plugins/wire';
import { requireViewHandler } from './handler';
import type { ViewSnapshot } from './messages';

const staleView = 'Plugin view changed; try again';

export type Open = Extract<PluginEvent, { type: 'open' }>;

export type Opening = Omit<Open, 'type' | 'viewId'>;

export interface OpenView extends ViewSnapshot {
  pluginId: string;
  projectId?: string;
  connectionId: string;
  opening: Open;
  watchers: number;
  backgroundInterval?: number;
}

export function createOpenView(
  pluginId: string,
  opening: Opening,
  connectionId: string,
): OpenView {
  return {
    pluginId,
    projectId: opening.slot?.context.projectId ?? opening.projectId,
    connectionId,
    events: viewEvents(),
    opening: { ...opening, type: 'open', viewId: createPluginViewId() },
    ...blankView(),
  };
}

function viewEvents(): OpenView['events'] {
  const events: OpenView['events'] = new EventEmitter();
  events.setMaxListeners(0);

  return events;
}

export type HeadlessView = { viewId: PluginViewId; close: () => void };

export function temporary(view: OpenView): boolean {
  return (
    Boolean(view.opening.renderSlot) || view.backgroundInterval !== undefined
  );
}

function blankView(): Pick<
  OpenView,
  'root' | 'revision' | 'workerRevision' | 'watchers' | 'refused'
> {
  return {
    root: null,
    revision: 0,
    workerRevision: null,
    watchers: 0,
    refused: false,
  };
}

type DispatchTarget = { viewId: PluginViewId; revision: number };

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
  target: DispatchTarget & { requestId: PluginDispatchId },
): Extract<PluginEvent, { type: 'dispatch' }> {
  return { ...input, ...target, type: 'dispatch' };
}

export function createPluginViewId(): PluginViewId {
  return PluginViewId.parse(randomUUID());
}
