import type {
  PluginViewId,
  ViewMessage,
  WireNode,
} from '@repo/contracts/plugins/wire';
import { createElement, type ReactNode } from 'react';
import { reportFailure } from './host-config';
import { cancelPageFrame, schedulePage } from './page-frame';
import { nextMessage, type OpenView } from './page-view';
import { mount } from './reconciler';
import { QueryViewContext } from './use-data';
import { toWire, type Handlers, type Instance } from './wire-tree';

export type PageHub = {
  ready: (viewId: PluginViewId, background: boolean) => boolean;
  send: (viewId: PluginViewId, message: ViewMessage) => Promise<void>;
  views: Map<PluginViewId, OpenView>;
};

type Content = {
  viewId: PluginViewId;
  element: ReactNode;
  replaceable: boolean;
  background?: boolean;
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

export function startPage(hub: PageHub, content: Content): void {
  const { viewId, element } = content;
  const view = pageView(content);
  const failed = drawingFailure(hub, view);

  hub.views.set(viewId, view);
  view.mounted = mount(
    createElement(QueryViewContext.Provider, { value: viewId }, element),
    (container) => schedule(hub, view, { container, failed }),
    failed,
  );
}

function failDrawing(hub: PageHub, view: OpenView, error: Error): void {
  if (view.broken) return;
  view.broken = true;
  cancelPageFrame(view);
  publish(hub, view, failedDrawingRoot(error.message));
}

type Commit = { container: Instance; failed: (error: Error) => void };

function schedule(
  hub: PageHub,
  view: OpenView,
  { container, failed }: Commit,
): void {
  schedulePage(view, () => {
    if (!canCommit(hub, view)) return;

    if (hub.ready(view.viewId, view.background === true)) {
      tryCommit(hub, view, { container, failed });
    } else {
      schedule(hub, view, { container, failed });
    }
  });
}

function pageView(content: Content): OpenView {
  return {
    viewId: content.viewId,
    replaceable: content.replaceable,
    background: content.background,
    frame: undefined,
    rendered: [],
    tree: null,
    revision: 0,
    handlers: new Map(),
  };
}

function drawingFailure(hub: PageHub, view: OpenView): (error: Error) => void {
  return (error) => failDrawing(hub, view, error);
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
  requireReplacementRoot(view, container);

  return container.children[0];
}

function requireReplacementRoot(view: OpenView, container: Instance): void {
  if (view.replaceable && container.children.length !== 1)
    throw new Error('A replacement must draw one component');
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
