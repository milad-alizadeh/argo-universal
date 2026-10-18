import { EventEmitter } from 'node:events';
import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import {
  pluginMessageBytes,
  pluginPageBytes,
  pluginPageFallback,
} from '@repo/contracts/plugins/wire-limits';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import type { PluginEvent } from './runtime-protocol';

export type Open = Extract<PluginEvent, { type: 'open' }>;

type ViewEvents = EventEmitter<{ message: [ViewMessage]; close: [] }>;

export interface OpenView {
  pluginId: string;
  path: string;
  // What mounts the view in the Plugin, again after a restart.
  opening: Open;
  root: WireNode | null;
  // Counted here, not by the worker, so a reloaded Plugin's fresh snapshot is never older than what an App already holds.
  revision: number;
  watchers: number;
  refused: boolean;
  events: ViewEvents;
}

export function createView(pluginId: string, opening: Open): OpenView {
  const events: ViewEvents = new EventEmitter();

  events.setMaxListeners(0);

  return {
    pluginId,
    path: opening.path,
    opening,
    root: null,
    revision: 0,
    watchers: 0,
    refused: false,
    events,
  };
}

function current(view: OpenView, message: ViewMessage): ViewMessage {
  if (message.type === 'snapshot')
    return { type: 'snapshot', revision: view.revision, root: message.root };

  return { type: 'patch', revision: view.revision, ops: message.ops };
}

function nextRoot(
  root: WireNode | null,
  message: ViewMessage,
): WireNode | null {
  if (message.type === 'snapshot') return message.root;

  return root && applyPatch(root, message.ops);
}

function update(view: OpenView, message: ViewMessage): void {
  const root = nextRoot(view.root, message);

  if (!root) return;
  view.root = root;
  view.revision += 1;
  view.events.emit('message', current(view, message));
}

export function receive(
  view: OpenView,
  message: ViewMessage,
  log: (line: string) => void,
): void {
  if (ignoresPatch(view, message)) return;
  const reason = refusalReason(view, message);

  if (reason) return refuse(view, reason, log);
  view.refused = false;
  update(view, message);
}

function refusalReason(view: OpenView, message: ViewMessage): string | null {
  const reason = overLimit(message, pluginMessageBytes, 'message');

  if (reason) return reason;
  const root = nextRoot(view.root, message);

  return root ? overLimit(root, pluginPageBytes, 'page') : null;
}

function overLimit(
  value: ViewMessage | WireNode,
  limit: number,
  kind: string,
): string | null {
  return Buffer.byteLength(JSON.stringify(value), 'utf8') > limit
    ? `${kind} exceeds ${limit} bytes`
    : null;
}

function refuse(
  view: OpenView,
  reason: string,
  log: (line: string) => void,
): void {
  if (view.refused) return;
  view.refused = true;
  log(`Plugin ${view.pluginId}: refused ${view.path}: ${reason}`);
  update(view, { type: 'snapshot', revision: 0, root: pluginPageFallback });
}

const ignoresPatch = (view: OpenView, message: ViewMessage): boolean =>
  view.refused && message.type === 'patch';
