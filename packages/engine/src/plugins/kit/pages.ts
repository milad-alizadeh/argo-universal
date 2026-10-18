import type {
  PluginRenderContext,
  PluginSurface,
} from '@repo/contracts/plugins/kit';
import type {
  PluginEvent,
  PluginViewId,
  PluginSlotInput,
  SlotId,
  ViewMessage,
  WireNode,
} from '@repo/contracts/plugins/wire';
import type { ComponentType, ReactNode } from 'react';
import { createElement } from 'react';
import { reportFailure } from './host-config';
import { schedulePage } from './page-frame';
import {
  nextMessage,
  runHandler,
  type OpenView,
  type DispatchSender,
} from './page-view';
import { mount } from './reconciler';
import { toWire, type Handlers, type Instance } from './wire-tree';

export type { DispatchSender } from './page-view';

export type ViewSender = (
  viewId: PluginViewId,
  message: ViewMessage,
) => Promise<void>;

type Page = ComponentType<{ context: PluginRenderContext }>;

// A Slot keeps its own fields alongside the App's surface.
type SlotContent = ComponentType<{
  context: PluginSlotInput['context'] & PluginRenderContext;
}>;

type Open = Extract<PluginEvent, { type: 'open' }>;

type Dispatch = Extract<PluginEvent, { type: 'dispatch' }>;

export interface Pages {
  register: (path: string, page: Page) => void;
  registerSlot: (slotId: SlotId, content: SlotContent) => void;
  receive: (event: PluginEvent) => void;
}

interface Hub {
  send: ViewSender;
  settle: DispatchSender;
  pages: Map<string, Page>;
  slots: Map<string, SlotContent>;
  views: Map<PluginViewId, OpenView>;
}

// An unhandled rejection ends the worker, which the Server reports as that Plugin's crash.
function transmit(hub: Hub, viewId: PluginViewId, message: ViewMessage): void {
  hub.send(viewId, message).catch(reportFailure);
}

function publish(hub: Hub, view: OpenView, next: WireNode): void {
  const message = nextMessage(view, next);

  view.revision = message.revision;
  view.tree = next;
  transmit(hub, view.viewId, message);
}

function committed(hub: Hub, view: OpenView, container: Instance): void {
  const root = container.children[0];

  const handlers: Handlers = new Map();
  const next = root ? toWire(root, handlers) : emptyPage();

  view.handlers = handlers;
  publish(hub, view, next);
}

function emptyPage(): WireNode {
  return { type: 'Column', key: '0', props: {}, children: [], slots: {} };
}

function start(hub: Hub, viewId: PluginViewId, element: ReactNode): void {
  const view: OpenView = {
    viewId,
    frame: undefined,
    tree: null,
    revision: 0,
    handlers: new Map(),
  };

  hub.views.set(viewId, view);
  view.mounted = mount(element, (container) => schedule(hub, view, container));
}

// A viewer that joins late gets the current tree again, as a snapshot.
function resend(hub: Hub, view: OpenView): void {
  if (!view.tree) return;
  transmit(hub, view.viewId, {
    type: 'snapshot',
    revision: view.revision,
    root: view.tree,
  });
}

function renderContext(
  surface: PluginSurface | undefined,
): PluginRenderContext {
  return surface
    ? {
        surface: Object.freeze({
          platform: surface.platform,
          parts: Object.freeze({ ...surface.parts }),
        }),
      }
    : {};
}

// Every page and Slot gets the surface of the Connection its view belongs to.
function elementOf(hub: Hub, { path, slot, surface }: Open): ReactNode | null {
  const context = renderContext(surface);

  if (slot) {
    const content = hub.slots.get(slot.slotId);

    return content
      ? createElement(content, {
          context: Object.freeze({ ...slot.context, ...context }),
        })
      : null;
  }
  const page = hub.pages.get(path);

  return page ? createElement(page, { context: Object.freeze(context) }) : null;
}

function open(hub: Hub, event: Open): void {
  const existing = hub.views.get(event.viewId);

  if (existing) return resend(hub, existing);
  const element = elementOf(hub, event);

  if (element) start(hub, event.viewId, element);
}

function close(hub: Hub, viewId: PluginViewId): void {
  const view = hub.views.get(viewId);

  if (!view) return;
  clearTimeout(view.frame);
  view.mounted?.unmount();
  hub.views.delete(viewId);
}

async function dispatch(hub: Hub, event: Dispatch): Promise<void> {
  try {
    await runHandler(hub.views.get(event.viewId), event);
    await hub.settle(event.requestId, { ok: true });
  } catch (error) {
    await hub.settle(event.requestId, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function receive(hub: Hub, event: PluginEvent): void {
  if (event.type === 'dispatch') void dispatch(hub, event).catch(reportFailure);
  else if (event.type === 'open') open(hub, event);
  else close(hub, event.viewId);
}

// A page or Slot content a Plugin registered, mounted on demand: each commit sends a snapshot first, then revisioned patches.
export function mountPages(send: ViewSender, settle: DispatchSender): Pages {
  const hub: Hub = {
    send,
    settle,
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

function schedule(hub: Hub, view: OpenView, container: Instance): void {
  schedulePage(view, () => {
    if (hub.views.get(view.viewId) === view) committed(hub, view, container);
  });
}
