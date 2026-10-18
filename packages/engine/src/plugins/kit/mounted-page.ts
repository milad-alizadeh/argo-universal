import type {
  PluginViewId,
  ViewMessage,
  WireNode,
} from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import { reportFailure } from './host-config';
import { schedulePage } from './page-frame';
import { nextMessage, type OpenView } from './page-view';
import { mount } from './reconciler';
import { toWire, type Handlers, type Instance } from './wire-tree';

export type PageHub = {
  send: (viewId: PluginViewId, message: ViewMessage) => Promise<void>;
  views: Map<PluginViewId, OpenView>;
};

type Content = {
  viewId: PluginViewId;
  element: ReactNode;
  replaceable: boolean;
};

export function transmit(
  hub: PageHub,
  viewId: PluginViewId,
  message: ViewMessage,
): void {
  hub.send(viewId, message).catch(reportFailure);
}

function publish(hub: PageHub, view: OpenView, next: WireNode): void {
  const message = nextMessage(view, next);

  view.revision = message.revision;
  view.tree = next;
  transmit(hub, view.viewId, message);
}

function committed(hub: PageHub, view: OpenView, container: Instance): void {
  const root = pageRoot(view, container);
  const handlers: Handlers = new Map();
  const next = root ? toWire(root, handlers) : emptyPage();

  view.handlers = handlers;
  publish(hub, view, next);
}

function emptyPage(): WireNode {
  return {
    type: 'Stack',
    key: '0',
    props: { direction: 'column' },
    children: [],
    slots: {},
  };
}

export function startPage(
  hub: PageHub,
  { viewId, element, replaceable }: Content,
): void {
  const view = pageView(viewId, replaceable);
  const failed = drawingFailure(hub, view, replaceable);

  hub.views.set(viewId, view);
  view.mounted = mount(
    element,
    (container) => schedule(hub, view, { container, failed }),
    failed,
  );
}

function failDrawing(hub: PageHub, view: OpenView, error: Error): void {
  view.broken = true;
  clearTimeout(view.frame);
  publish(hub, view, failedDrawingRoot(error.message));
}

type Commit = { container: Instance; failed: (error: Error) => void };

function schedule(
  hub: PageHub,
  view: OpenView,
  { container, failed }: Commit,
): void {
  schedulePage(view, () => {
    if (canCommit(hub, view)) tryCommit(hub, view, { container, failed });
  });
}

function pageView(viewId: PluginViewId, replaceable: boolean): OpenView {
  return {
    viewId,
    replaceable,
    frame: undefined,
    tree: null,
    revision: 0,
    handlers: new Map(),
  };
}

function drawingFailure(
  hub: PageHub,
  view: OpenView,
  replaceable: boolean,
): (error: Error) => void {
  return replaceable ? (error) => failDrawing(hub, view, error) : reportFailure;
}

const canCommit = (hub: PageHub, view: OpenView): boolean =>
  !view.broken && hub.views.get(view.viewId) === view;

function tryCommit(
  hub: PageHub,
  view: OpenView,
  { container, failed }: Commit,
): void {
  try {
    committed(hub, view, container);
  } catch (error) {
    failed(error instanceof Error ? error : new Error(String(error)));
  }
}

function pageRoot(view: OpenView, container: Instance): Instance | undefined {
  if (view.replaceable && container.children.length !== 1)
    throw new Error('A replacement must draw one component');

  return container.children[0];
}

export function failedDrawingRoot(reason: string): WireNode {
  return {
    type: '#render-error',
    key: '0',
    props: { reason },
    children: [],
    slots: {},
  };
}
