import type {
  PluginEvent,
  PluginViewId,
  SlotId,
  ViewMessage,
} from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import { reportFailure } from './host-config';
import { startPage, transmit } from './mounted-page';
import { runHandler, type OpenView, type DispatchSender } from './page-view';
import { ReplacementPages } from './replacement-pages';
import { elementOf, type Page, type SlotContent } from './view-content';

export type { DispatchSender } from './page-view';

export type ViewSender = (
  viewId: PluginViewId,
  message: ViewMessage,
) => Promise<void>;

type Open = Extract<PluginEvent, { type: 'open' }>;

type Dispatch = Extract<PluginEvent, { type: 'dispatch' }>;

export interface Pages {
  register: (path: string, page: Page) => void;
  registerSlot: (slotId: SlotId, content: SlotContent) => void;
  receive: (event: PluginEvent) => void;
  registerReplacement: (path: string, element: ReactNode) => void;
}

interface Hub {
  send: ViewSender;
  settle: DispatchSender;
  pages: Map<string, Page>;
  slots: Map<string, SlotContent>;
  views: Map<PluginViewId, OpenView>;
  replacements: ReplacementPages;
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

function open(hub: Hub, event: Open): void {
  const existing = hub.views.get(event.viewId);

  if (existing) return resend(hub, existing);
  openElement(hub, event);
}

function openElement(hub: Hub, event: Open): void {
  const element = hub.replacements.take(event.path) ?? elementOf(hub, event);

  if (element)
    startPage(hub, {
      viewId: event.viewId,
      element,
      replaceable: Boolean(event.renderSlot),
    });
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
  const hub = pageHub(send, settle);

  return {
    register: (path, page) => void hub.pages.set(path, page),
    registerSlot: (slotId, content) => void hub.slots.set(slotId, content),
    receive: (event) => receive(hub, event),
    registerReplacement: (path, element) =>
      hub.replacements.register(path, element),
  };
}

function pageHub(send: ViewSender, settle: DispatchSender): Hub {
  return {
    send,
    settle,
    pages: new Map(),
    slots: new Map(),
    views: new Map(),
    replacements: new ReplacementPages(),
  };
}
