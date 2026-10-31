import { PluginViewId } from '@repo/contracts/plugins/wire';
import type {
  PluginEvent,
  PluginViewInput,
  PluginDispatchInput,
} from '@repo/contracts/plugins/wire';
import {
  createOpenView,
  createPluginViewId,
  type OpenView,
  type Opening,
} from './open-view';
import { openingKey } from './opening-key';

type ViewIdentity = Pick<
  PluginViewInput,
  'pluginId' | 'path' | 'projectId' | 'sessionId'
>;

type ViewTarget = Pick<PluginDispatchInput, 'pluginId' | 'path' | 'viewId'>;

/*
 * What became of one view. Each callback carries the view itself, so a caller can key on the Opening it
 * belongs to rather than on the viewId a reload rotates.
 */
export type ViewLifecycle = {
  opened: (view: OpenView) => void;
  released: (view: OpenView, lastOfOpening: boolean) => void;
  received: (view: OpenView) => void;
  failed: (view: OpenView, message: string) => void;
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
    private readonly dropped: (view: OpenView, lastOfOpening: boolean) => void,
  ) {}

  values(): MapIterator<OpenView> {
    return this.views.values();
  }

  // `watchers` counts one connection's Apps, so the views left open for this Opening are counted instead.
  private drop(view: OpenView): void {
    const key = openingKey(view);

    this.dropped(view, !this.values().some((open) => openingKey(open) === key));
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
        projectId: opening.projectId,
        sessionId: opening.sessionId,
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
    // The view is still registered, so its Opening outlives the viewId this mints.
    this.drop(view);
    this.views.delete(view.opening.viewId);
    view.opening = { ...view.opening, viewId: createPluginViewId() };
    view.workerRevision = null;
    this.views.set(view.opening.viewId, view);
  }

  remove(view: OpenView): void {
    if (!this.views.delete(view.opening.viewId)) return;
    this.drop(view);
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
    view.projectId === identity.projectId &&
    view.opening.sessionId === identity.sessionId
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
