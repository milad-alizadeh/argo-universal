import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import {
  type PluginDispatchInput,
  PluginViewId,
  type PluginDispatchId,
  type PluginEvent,
  type ViewMessage,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import type { RpcConnection } from '../../rpc';
import { drawsFor, type Draws } from './draws';
import { requireViewHandler } from './handler';

const staleView = 'Plugin view changed; try again';

export type Open = Extract<PluginEvent, { type: 'open' }>;

export type Opening = Omit<Open, 'type' | 'viewId'>;

type ViewEvents = EventEmitter<{ message: [ViewMessage]; close: [] }>;

/*
 * One App's view of a Plugin route or Slot. `root` is the Plugin's tree as the worker sent it, which
 * handlers and data are looked up in; `drawn` is the sanitised, prepared tree the App holds, at
 * `revision`. `refused` is set while the App holds the fallback for a tree over the wire caps.
 */
export interface OpenView {
  pluginId: string;
  draws: Draws;
  root: WireNode | null;
  drawn: WireNode | null;
  revision: number;
  workerRevision: number | null;
  refused: boolean;
  events: ViewEvents;
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
    draws: drawsFor(opening),
    projectId: opening.projectId,
    connectionId,
    events: viewEvents(),
    opening: { ...opening, type: 'open', viewId: createPluginViewId() },
    ...blankView(),
  };
}

function viewEvents(): ViewEvents {
  const events: ViewEvents = new EventEmitter();
  events.setMaxListeners(0);

  return events;
}

export type HeadlessView = { viewId: PluginViewId; close: () => void };

export function temporary(view: OpenView): boolean {
  return view.draws.temporary || view.backgroundInterval !== undefined;
}

function blankView(): Pick<
  OpenView,
  'root' | 'drawn' | 'revision' | 'workerRevision' | 'watchers' | 'refused'
> {
  return {
    root: null,
    drawn: null,
    revision: 0,
    workerRevision: null,
    watchers: 0,
    refused: false,
  };
}

// The Plugin's tree as the worker sent it, which handlers and data are looked up in; none until the next snapshot.
export function holdRoot(view: OpenView, root: WireNode | null): void {
  view.root = root;
}

// The worker's message was not drawn, so no handler answers it.
export function forgetWorkerRevision(view: OpenView): void {
  view.workerRevision = null;
}

type WorkerTree = {
  tree: WireNode;
  message: ViewMessage;
  workerRevision: number;
};

// The App holds the tree drawn from the worker's message at `workerRevision`.
export function showWorkerTree(
  view: OpenView,
  { tree, message, workerRevision }: WorkerTree,
): void {
  view.refused = false;
  view.workerRevision = workerRevision;
  show(view, tree, message);
}

// The App holds core's fallback in place of a tree over the wire caps.
export function showFallback(
  view: OpenView,
  fallback: WireNode,
  message: ViewMessage,
): void {
  view.refused = true;
  show(view, fallback, message);
}

function show(view: OpenView, tree: WireNode, message: ViewMessage): void {
  view.drawn = tree;
  view.revision = message.revision;
  view.events.emit('message', message);
}

type DispatchTarget = { viewId: PluginViewId; revision: number };

export function currentDispatch(
  view: OpenView | undefined,
  input: PluginDispatchInput,
): DispatchTarget {
  if (view?.opening.viewId !== input.viewId) throw new Error(staleView);

  return dispatchTarget(view, input);
}

/*
 * ADR-0031: a dispatch names its node, so it runs against the view's current tree and is refused
 * only when that node is gone. The App's own revision is not required to be the current one: a view
 * that moves on by itself, as a page settling after its first rows draw does, leaves the App holding
 * an earlier tree through no fault of its own.
 */
function dispatchTarget(
  view: OpenView,
  input: PluginDispatchInput,
): DispatchTarget {
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

export function connectionOpening(
  opening: Opening,
  connection: RpcConnection,
): Opening {
  return {
    ...opening,
    surface: connection.surface,
    serverDevice: connection.serverDevice === true,
  };
}
