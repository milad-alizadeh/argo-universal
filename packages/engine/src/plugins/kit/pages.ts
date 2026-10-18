import type {
  PluginEvent,
  PluginSlotInput,
  SlotId,
  ViewMessage,
  WireNode,
} from '@repo/contracts/plugins/wire';
import type { ComponentType, ReactNode } from 'react';
import { createElement } from 'react';
import { diff } from './diff';
import { reportFailure } from './host-config';
import { mount, type Mounted } from './reconciler';
import { toWire, type Handlers, type Instance } from './wire-tree';

export type ViewSender = (path: string, message: ViewMessage) => Promise<void>;

type Page = () => ReactNode;

// A Slot's content takes the Slot's context, frozen, as its one prop.
type SlotContent = ComponentType<{ context: PluginSlotInput['context'] }>;

type Open = Extract<PluginEvent, { type: 'open' }>;

type Dispatch = Extract<PluginEvent, { type: 'dispatch' }>;

interface OpenView {
  path: string;
  mounted?: Mounted;
  tree: WireNode | null;
  revision: number;
  handlers: Handlers;
  frame?: ReturnType<typeof setTimeout>;
}

export interface Pages {
  register: (path: string, page: Page) => void;
  registerSlot: (slotId: SlotId, content: SlotContent) => void;
  receive: (event: PluginEvent) => void;
}

interface Hub {
  send: ViewSender;
  pages: Map<string, Page>;
  slots: Map<string, SlotContent>;
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

function start(hub: Hub, path: string, element: ReactNode): void {
  const view: OpenView = { path, tree: null, revision: 0, handlers: new Map() };

  hub.views.set(path, view);
  view.mounted = mount(element, (container) => schedule(hub, view, container));
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

function pageElement(hub: Hub, path: string): ReactNode | null {
  const page = hub.pages.get(path);

  return page ? createElement(page) : null;
}

function slotElement(hub: Hub, slot: PluginSlotInput): ReactNode | null {
  const content = hub.slots.get(slot.slotId);

  return content
    ? createElement(content, { context: Object.freeze({ ...slot.context }) })
    : null;
}

// What the open view draws: a registered page, or the Slot content with its context; none when the Plugin registered neither.
const elementOf = (hub: Hub, { path, slot }: Open): ReactNode | null =>
  slot ? slotElement(hub, slot) : pageElement(hub, path);

function open(hub: Hub, event: Open): void {
  const existing = hub.views.get(event.path);

  if (existing) return resend(hub, existing);
  const element = elementOf(hub, event);

  if (element) start(hub, event.path, element);
}

function close(hub: Hub, path: string): void {
  const view = hub.views.get(path);

  if (!view) return;
  clearTimeout(view.frame);
  view.mounted?.unmount();
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
  else if (event.type === 'open') open(hub, event);
  else close(hub, event.path);
}

// A page or Slot content a Plugin registered, mounted on demand: each commit sends a snapshot first, then revisioned patches.
export function mountPages(send: ViewSender): Pages {
  const hub: Hub = {
    send,
    pages: new Map(),
    slots: new Map(),
    views: new Map(),
  };

  return {
    register: (path, page) => void hub.pages.set(path, page),
    registerSlot: (slotId, content) => void hub.slots.set(slotId, content),
    receive: (event) => receive(hub, event),
  };
}

const frameMs = 16;

function flush(hub: Hub, view: OpenView, container: Instance): void {
  view.frame = undefined;

  try {
    committed(hub, view, container);
  } catch (error) {
    reportFailure(error instanceof Error ? error : new Error(String(error)));
  }
}

// One publication per 60 Hz frame, retaining the latest committed tree and its handlers together.
function schedule(hub: Hub, view: OpenView, container: Instance): void {
  if (view.frame !== undefined) return;
  view.frame = setTimeout(() => {
    if (hub.views.get(view.path) === view) flush(hub, view, container);
  }, frameMs);
}
