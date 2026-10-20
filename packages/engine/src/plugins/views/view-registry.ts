import { PluginViewId } from '@repo/contracts/plugins/wire';
import type {
  PluginEvent,
  PluginViewInput,
  PluginDispatchInput,
} from '@repo/contracts/plugins/wire';
import {
  createOpenView,
  createPluginViewId,
  projectOfOpening,
  type OpenView,
  type Opening,
} from './open-view';

type ViewIdentity = Pick<PluginViewInput, 'pluginId' | 'path' | 'projectId'>;

type ViewTarget = Pick<PluginDispatchInput, 'pluginId' | 'path' | 'viewId'>;

export type ViewLifecycle = {
  opened: (pluginId: string) => void;
  released: (viewId: PluginViewId) => void;
  received: (view: OpenView) => void;
  failed: (pluginId: string, message: string) => void;
};

export const noViewLifecycle: ViewLifecycle = {
  opened: (): void => {},
  released: (): void => {},
  received: (): void => {},
  failed: (): void => {},
};

export class ViewRegistry {
  private readonly views = new Map<PluginViewId, OpenView>();

  constructor(
    private readonly send: (pluginId: string, event: PluginEvent) => void,
    private readonly dropped: (viewId: PluginViewId) => void,
  ) {}

  values(): MapIterator<OpenView> {
    return this.views.values();
  }

  owned(pluginId: string, id: string): OpenView {
    const view = this.views.get(PluginViewId.parse(id));

    if (view?.pluginId !== pluginId)
      throw new Error('Plugin view is no longer available');

    return view;
  }

  get(viewId: PluginViewId): OpenView | undefined {
    return this.views.get(viewId);
  }

  find(connectionId: string, input: ViewTarget): OpenView | undefined {
    const view = this.get(input.viewId);

    return view && matches(view, connectionId, input) ? view : undefined;
  }

  acquire(pluginId: string, opening: Opening, connectionId: string): OpenView {
    const view =
      this.page(connectionId, {
        pluginId,
        path: opening.path,
        projectId: projectOfOpening(opening),
      }) ?? this.open(pluginId, opening, connectionId);

    view.watchers += 1;

    return view;
  }

  private page(
    connectionId: string,
    identity: ViewIdentity,
  ): OpenView | undefined {
    return this.values().find((view) => samePage(view, connectionId, identity));
  }

  open(pluginId: string, opening: Opening, connectionId: string): OpenView {
    const view = createOpenView(pluginId, opening, connectionId);

    this.views.set(view.opening.viewId, view);
    this.send(pluginId, view.opening);

    return view;
  }

  release(view: OpenView): void {
    view.watchers -= 1;

    if (view.watchers === 0) this.remove(view);
  }

  retire(view: OpenView): void {
    this.dropped(view.opening.viewId);
    this.views.delete(view.opening.viewId);
    view.opening = { ...view.opening, viewId: createPluginViewId() };
    view.workerRevision = null;
    this.views.set(view.opening.viewId, view);
  }

  remove(view: OpenView): void {
    if (!this.views.delete(view.opening.viewId)) return;
    this.dropped(view.opening.viewId);
    view.events.emit('close');
    this.send(view.pluginId, { type: 'close', viewId: view.opening.viewId });
  }
}

function samePage(
  view: OpenView,
  connectionId: string,
  identity: ViewIdentity,
): boolean {
  return (
    matches(view, connectionId, identity) &&
    view.projectId === identity.projectId
  );
}

function matches(
  view: OpenView,
  connectionId: string,
  input: Pick<ViewIdentity, 'pluginId' | 'path'>,
): boolean {
  return (
    view.connectionId === connectionId &&
    view.pluginId === input.pluginId &&
    view.opening.path === input.path
  );
}
