import type { RenderFailureInput } from '@repo/contracts/plugins/replaceable';
import type {
  PluginDispatchInput,
  PluginViewId,
  PluginEvent,
  ViewMessage,
} from '@repo/contracts/plugins/wire';
import type { RpcConnection } from '../rpc';
import { appView } from './app-view';
import { PluginDispatches } from './dispatches';
import {
  createOpenView,
  createPluginViewId,
  currentDispatch,
  dispatchEvent,
  type OpenView,
  type Opening,
} from './open-view';
import { reportDrawingFailure } from './view-render-failure';
import { receive } from './view-state';

export class PluginViews {
  private revision = 0;
  private readonly views = new Map<PluginViewId, OpenView>();
  public readonly dispatches = new PluginDispatches();

  constructor(
    private readonly send: (pluginId: string, event: PluginEvent) => void,
    private readonly log: (line: string) => void,
  ) {}

  public receive(
    pluginId: string,
    viewId: PluginViewId,
    message: ViewMessage,
  ): void {
    const view = this.views.get(viewId);

    if (view?.pluginId === pluginId)
      receive(view, message, { log: this.log, revision: ++this.revision });
  }

  public dispatch(
    connection: RpcConnection,
    input: PluginDispatchInput,
  ): Promise<void> {
    const event = currentDispatch(this.find(connection.id, input), input);

    const { requestId, answer } = this.dispatches.wait(
      input.pluginId,
      event.viewId,
    );

    this.send(input.pluginId, dispatchEvent(input, { ...event, requestId }));

    return answer;
  }

  public reopen(pluginId: string): void {
    const views = [...this.views.values()].filter(
      (view) => view.pluginId === pluginId,
    );

    for (const view of views) this.restart(view);
  }

  private restart(view: OpenView): void {
    this.retire(view);
    this.send(view.pluginId, view.opening);
  }

  private retire(view: OpenView): void {
    this.dispatches.end(view.opening.viewId);
    this.views.delete(view.opening.viewId);
    view.opening = { ...view.opening, viewId: createPluginViewId() };
    view.workerRevision = null;
    this.views.set(view.opening.viewId, view);
  }

  public close(): void {
    for (const view of this.views.values()) this.remove(view);
  }

  public end(pluginId: string): void {
    for (const view of this.views.values())
      if (view.pluginId === pluginId) this.remove(view);
  }

  public invalidate(pluginId: string): void {
    const views = [...this.views.values()].filter(
      (view) => view.pluginId === pluginId,
    );

    for (const view of views) {
      if (view.opening.renderSlot) this.remove(view);
      else this.retire(view);
    }
  }

  public async *watch(
    pluginId: string,
    opening: Opening,
    connection: RpcConnection,
  ): AsyncGenerator<ViewMessage> {
    const reported = { ...opening, surface: connection.surface };

    const view = this.acquire(pluginId, reported, connection.id);

    try {
      yield* appView(view, connection, this.log);
    } finally {
      this.release(view);
    }
  }

  public renderFailed(
    connection: RpcConnection,
    input: RenderFailureInput,
  ): void {
    reportDrawingFailure(this.find(connection.id, input), input, this.log);
  }

  private find(
    connectionId: string,
    input: { pluginId: string; path: string },
  ): OpenView | undefined {
    return [...this.views.values()].find(
      (view) =>
        view.connectionId === connectionId &&
        view.pluginId === input.pluginId &&
        view.opening.path === input.path,
    );
  }

  private acquire(
    pluginId: string,
    opening: Opening,
    connectionId: string,
  ): OpenView {
    const view =
      this.find(connectionId, { pluginId, path: opening.path }) ??
      this.open(pluginId, opening, connectionId);

    view.watchers += 1;

    return view;
  }

  private open(
    pluginId: string,
    opening: Opening,
    connectionId: string,
  ): OpenView {
    const view = createOpenView(pluginId, opening, connectionId);
    this.views.set(view.opening.viewId, view);
    this.send(pluginId, view.opening);

    return view;
  }

  private release(view: OpenView): void {
    view.watchers -= 1;

    if (view.watchers === 0) this.remove(view);
  }

  private remove(view: OpenView): void {
    if (!this.views.delete(view.opening.viewId)) return;
    this.dispatches.end(view.opening.viewId);
    view.events.emit('close');
    this.send(view.pluginId, { type: 'close', viewId: view.opening.viewId });
  }
}
