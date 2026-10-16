import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { mount, type Mounted } from './reconciler';
import { diff, toWire, type Handlers, type Instance } from './wire-tree';

export type ViewSender = (path: string, message: ViewMessage) => Promise<void>;

export interface KitEvent {
  type: 'open' | 'close' | 'dispatch';
  path: string;
  eventId?: string;
  payload?: unknown;
}

type Page = () => ReactNode;

interface OpenView {
  mounted: Mounted;
  tree: WireNode | null;
  revision: number;
  handlers: Handlers;
}

// A page a Plugin registered, mounted on demand: each commit sends a snapshot first, then revisioned patches.
export function mountPages(send: ViewSender): {
  register: (path: string, page: Page) => void;
  receive: (event: KitEvent) => void;
} {
  const pages = new Map<string, Page>();
  const views = new Map<string, OpenView>();

  // An unhandled rejection ends the worker, which the Server reports as that Plugin's crash.
  const report = (error: Error): void => {
    void Promise.reject(error);
  };

  const committed = (path: string, view: OpenView, container: Instance): void => {
    const handlers: Handlers = new Map();
    const root = container.children[0];

    if (!root) return;
    const next = toWire(root, handlers);
    view.handlers = handlers;
    publish(path, view, next);
  };

  const publish = (path: string, view: OpenView, next: WireNode): void => {
    const previous = view.tree;
    const ops = previous ? diff(previous, next) : [];

    if (previous && ops.length === 0) return;
    view.revision += 1;
    view.tree = next;
    const message: ViewMessage = previous
      ? { type: 'patch', revision: view.revision, ops }
      : { type: 'snapshot', revision: view.revision, root: next };

    void send(path, message).catch(report);
  };

  const open = (path: string): void => {
    const existing = views.get(path);

    if (existing?.tree) {
      void send(path, {
        type: 'snapshot',
        revision: existing.revision,
        root: existing.tree,
      }).catch(report);

      return;
    }
    const page = pages.get(path);

    if (!page || existing) return;
    const view: OpenView = {
      mounted: null as unknown as Mounted,
      tree: null,
      revision: 0,
      handlers: new Map(),
    };
    views.set(path, view);
    view.mounted = mount(
      createElement(page),
      (container) => committed(path, view, container),
      report,
    );
  };

  const close = (path: string): void => {
    views.get(path)?.mounted.unmount();
    views.delete(path);
  };

  const dispatch = (event: KitEvent): void => {
    const handler = views.get(event.path)?.handlers.get(event.eventId ?? '');

    if (handler) {
      Promise.resolve()
        .then(() => handler(event.payload))
        .catch(report);
    }
  };

  return {
    register: (path, page): void => void pages.set(path, page),
    receive: (event): void => {
      if (event.type === 'open') open(event.path);
      else if (event.type === 'close') close(event.path);
      else dispatch(event);
    },
  };
}
