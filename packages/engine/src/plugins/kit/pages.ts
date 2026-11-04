import type { Page } from '@repo/contracts/plugins/argo-api';
import type {
  PluginEvent,
  PluginViewId,
  ViewMessage,
} from '@repo/contracts/plugins/wire';
import { reportFailure } from './host-config';
import { startPage } from './mounted-page';
import { cancelPageFrame } from './page-frame';
import { runHandler, type OpenView, type DispatchSender } from './page-view';
import { elementOf } from './view-content';
import { withView } from './view-scope';

export type { DispatchSender } from './page-view';

export type ViewSender = (
  viewId: PluginViewId,
  message: ViewMessage,
) => Promise<void>;

type Open = Extract<PluginEvent, { type: 'open' }>;

type Dispatch = Extract<PluginEvent, { type: 'dispatch' }>;

// What the pages answer: data goes to `useData`, items calls to the Slot providers, Operations to their handlers, and draws, stops and named reads to the Loader pages.
type PageEvent = Exclude<
  PluginEvent,
  { type: 'data' | 'slotItems' | 'operation' | 'draw' | 'read' | 'stop' }
>;

export interface Pages {
  register: (path: string, page: Page) => void;
  receive: (event: PageEvent) => void;
  requirePage: (path: string, contribution: string) => void;
}

interface Hub {
  ready: (viewId: PluginViewId) => boolean;
  send: ViewSender;
  settle: DispatchSender;
  pages: Map<string, Page>;
  views: Map<PluginViewId, OpenView>;
}

// A viewer that joins late gets the current tree again, as a snapshot.
function resend(hub: Hub, view: OpenView): void {
  if (!view.tree) return;
  void hub
    .send(view.viewId, {
      type: 'snapshot',
      revision: view.revision,
      root: view.tree,
    })
    .catch(reportFailure);
}

function open(hub: Hub, event: Open): void {
  const existing = hub.views.get(event.viewId);

  if (existing) return resend(hub, existing);
  openElement(hub, event);
}

function openElement(hub: Hub, event: Open): void {
  const element = elementOf(hub, event);

  if (element) startPage(hub, { viewId: event.viewId, element });
}

function close(hub: Hub, viewId: PluginViewId): void {
  const view = hub.views.get(viewId);

  if (!view) return;
  cancelPageFrame(view);
  view.mounted?.unmount();
  hub.views.delete(viewId);
}

async function dispatch(hub: Hub, event: Dispatch): Promise<void> {
  try {
    await withView(event.viewId, () =>
      runHandler(hub.views.get(event.viewId), event),
    );
    await hub.settle(event.requestId, { ok: true });
  } catch (error) {
    await hub.settle(event.requestId, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function receive(hub: Hub, event: PageEvent): void {
  if (event.type === 'dispatch') void dispatch(hub, event).catch(reportFailure);
  else receiveDrawing(hub, event);
}

// A page a Plugin registered, mounted on demand: each commit sends a snapshot first, then revisioned patches.
export function mountPages(
  send: ViewSender,
  settle: DispatchSender,
  ready: Hub['ready'],
): Pages {
  const hub = pageHub(send, settle, ready);

  return {
    register: (path, page) => void hub.pages.set(path, page),
    receive: (event) => receive(hub, event),
    requirePage: (path, contribution) => requirePage(hub, path, contribution),
  };
}

function requirePage(hub: Hub, path: string, contribution: string): void {
  if (!hub.pages.has(path))
    throw new Error(`${contribution} path ${path} is not a registered page`);
}

function pageHub(
  send: ViewSender,
  settle: DispatchSender,
  ready: Hub['ready'],
): Hub {
  return {
    ready,
    send,
    settle,
    pages: new Map(),
    views: new Map(),
  };
}

function receiveDrawing(
  hub: Hub,
  event: Exclude<PageEvent, { type: 'dispatch' }>,
): void {
  if (event.type === 'open') open(hub, event);
  else close(hub, event.viewId);
}
