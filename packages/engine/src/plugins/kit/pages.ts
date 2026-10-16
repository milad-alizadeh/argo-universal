import type {
  PluginEvent,
  ViewMessage,
  WireNode,
} from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { diff } from './diff';
import { reportFailure } from './host-config';
import { mount, type Mounted } from './reconciler';
import { toWire, type Handlers, type Instance } from './wire-tree';

export type ViewSender = (path: string, message: ViewMessage) => Promise<void>;

type Page = () => ReactNode;

type Dispatch = Extract<PluginEvent, { type: 'dispatch' }>;

interface OpenView {
  path: string;
  mounted?: Mounted;
  tree: WireNode | null;
  revision: number;
  handlers: Handlers;
}

export interface Pages {
  register: (path: string, page: Page) => void;
  receive: (event: PluginEvent) => void;
}

interface Hub {
  send: ViewSender;
  pages: Map<string, Page>;
  views: Map<string, OpenView>;
}

// An unhandled rejection ends the worker, which the Server reports as that Plugin's crash.
function transmit(hub: Hub, path: string, message: ViewMessage): void {
  hub.send(path, message).catch(reportFailure);
}

function nextMessage(view: OpenView, next: WireNode): ViewMessage | null {
  const revision = view.revision + 1;

  if (!view.tree) return { type: 'snapshot', revision, root: next };
  const ops = diff(view.tree, next);

  return ops.length === 0 ? null : { type: 'patch', revision, ops };
}

function publish(hub: Hub, view: OpenView, next: WireNode): void {
  const message = nextMessage(view, next);

  if (!message) return;
  view.revision = message.revision;
  view.tree = next;
  transmit(hub, view.path, message);
}

function committed(hub: Hub, view: OpenView, container: Instance): void {
  const root = container.children[0];

  if (!root) return;
  const handlers: Handlers = new Map();
  const next = toWire(root, handlers);

  view.handlers = handlers;
  publish(hub, view, next);
}

function start(hub: Hub, path: string, page: Page): void {
  const view: OpenView = { path, tree: null, revision: 0, handlers: new Map() };

  hub.views.set(path, view);
  view.mounted = mount(createElement(page), (container) =>
    committed(hub, view, container),
  );
}

// A viewer that joins late gets the current tree again, as a snapshot.
function resend(hub: Hub, view: OpenView): void {
  if (!view.tree) return;
  transmit(hub, view.path, {
    type: 'snapshot',
    revision: view.revision,
    root: view.tree,
  });
}

function open(hub: Hub, path: string): void {
  const existing = hub.views.get(path);
  const page = hub.pages.get(path);

  if (existing) resend(hub, existing);
  else if (page) start(hub, path, page);
}

function close(hub: Hub, path: string): void {
  hub.views.get(path)?.mounted?.unmount();
  hub.views.delete(path);
}

function dispatch(hub: Hub, event: Dispatch): void {
  const handler = hub.views.get(event.path)?.handlers.get(event.eventId);

  if (handler)
    Promise.resolve()
      .then(() => handler(event.payload))
      .catch(reportFailure);
}

function receive(hub: Hub, event: PluginEvent): void {
  if (event.type === 'dispatch') dispatch(hub, event);
  else if (event.type === 'open') open(hub, event.path);
  else close(hub, event.path);
}

// A page a Plugin registered, mounted on demand: each commit sends a snapshot first, then revisioned patches.
export function mountPages(send: ViewSender): Pages {
  const hub: Hub = { send, pages: new Map(), views: new Map() };

  return {
    register: (path, page) => {
      hub.pages.set(path, page);
    },
    receive: (event) => receive(hub, event),
  };
}
