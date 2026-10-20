import type { RenderFailureInput } from '@repo/contracts/plugins/replaceable';
import type {
  PluginDispatchInput,
  PluginViewId,
  PluginEvent,
  ViewMessage,
} from '@repo/contracts/plugins/wire';
import type { RpcConnection } from '../../rpc';
import { appView } from './app-view';
import { PluginDispatches } from './dispatches';
import { drawingFailure } from './drawing-failure';
import {
  currentDispatch,
  dispatchEvent,
  temporary,
  type HeadlessView,
  type OpenView,
  type Opening,
} from './open-view';
import { reportDrawingFailure } from './render-failure';
import { receive } from './state';
import {
  ViewRegistry,
  noViewLifecycle,
  type ViewLifecycle,
} from './view-registry';

export class PluginViews {
  private revision = 0;
  private readonly views;
  public readonly dispatches = new PluginDispatches();

  constructor(
    private readonly send: (pluginId: string, event: PluginEvent) => void,
    private readonly log: (line: string) => void,
    private readonly lifecycle: ViewLifecycle = noViewLifecycle,
  ) {
    this.views = new ViewRegistry(send, (viewId) => this.dropped(viewId));
  }

  private dropped(viewId: PluginViewId): void {
    this.dispatches.end(viewId);
    this.lifecycle.released(viewId);
  }

  public dataView(pluginId: string, viewId: string): OpenView {
    return this.views.owned(pluginId, viewId);
  }

  public receive(
    pluginId: string,
    viewId: PluginViewId,
    message: ViewMessage,
  ): void {
    const view = this.views.get(viewId);

    if (view?.pluginId === pluginId) this.receiveCurrent(view, message);
  }

  private receiveCurrent(view: OpenView, message: ViewMessage): void {
    const reason = drawingFailure(view, message);

    if (reason !== undefined) return this.failed(view, reason);
    receive(view, message, { log: this.log, revision: ++this.revision });
    this.lifecycle.received(view);
  }

  private failed(view: OpenView, reason: string): void {
    this.log(
      `Plugin ${view.pluginId}: could not draw ${view.opening.path}: ${reason}`,
    );
    this.lifecycle.failed(view.pluginId, reason);
    this.views.remove(view);
  }

  public headless(
    pluginId: string,
    opening: Opening,
    interval: number,
  ): HeadlessView {
    const view = this.views.open(pluginId, opening, 'background');

    view.backgroundInterval = interval;

    return {
      viewId: view.opening.viewId,
      close: () => this.views.remove(view),
    };
  }

  public endProject(projectId: string): void {
    for (const view of this.views
      .values()
      .filter((view) => view.projectId === projectId))
      this.views.remove(view);
  }

  public dispatch(
    connection: RpcConnection,
    input: PluginDispatchInput,
  ): Promise<void> {
    const event = currentDispatch(this.views.find(connection.id, input), input);

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
    this.views.retire(view);
    this.send(view.pluginId, view.opening);
  }

  public close(): void {
    for (const view of this.views.values()) this.views.remove(view);
  }

  public end(pluginId: string): void {
    for (const view of this.views.values())
      if (view.pluginId === pluginId) this.views.remove(view);
  }

  public invalidate(pluginId: string): void {
    const views = [...this.views.values()].filter(
      (view) => view.pluginId === pluginId,
    );

    for (const view of views) {
      if (temporary(view)) this.views.remove(view);
      else this.views.retire(view);
    }
  }

  public async *watch(
    pluginId: string,
    opening: Opening,
    connection: RpcConnection,
  ): AsyncGenerator<ViewMessage> {
    this.lifecycle.opened(pluginId);
    const reported = { ...opening, surface: connection.surface };

    const view = this.views.acquire(pluginId, reported, connection.id);

    try {
      yield* appView(view, connection, this.log);
    } finally {
      this.views.release(view);
    }
  }

  public discardRender(pluginId: string, path: string): void {
    this.send(pluginId, { type: 'discardRender', path });
  }

  public renderFailed(
    connection: RpcConnection,
    input: RenderFailureInput,
  ): void {
    reportDrawingFailure(
      this.views.find(connection.id, input),
      input,
      this.log,
    );
  }
}
