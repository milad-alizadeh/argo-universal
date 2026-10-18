import type { PartVersions } from '@repo/contracts/plugins/kit';
import type {
  PluginDispatchInput,
  ViewMessage,
} from '@repo/contracts/plugins/wire';
import { compatibleView } from './compatible-view';
import type { PluginEvent } from './runtime-protocol';
import { createView, receive, type Open, type OpenView } from './view-state';
import { messages } from './view-stream';

/*
 * The pages Apps watch: each Plugin page is mounted while at least one subscription is open,
 * and every watcher gets the current snapshot first, then the patches that follow.
 */
export class PluginViews {
  private readonly views = new Map<string, OpenView>();

  constructor(
    private readonly send: (pluginId: string, event: PluginEvent) => void,
    private readonly log: (line: string) => void,
  ) {}

  receive(pluginId: string, path: string, message: ViewMessage): void {
    const view = this.views.get(keyOf(pluginId, path));

    if (view) receive(view, message, this.log);
  }

  dispatch(input: PluginDispatchInput): void {
    const { pluginId, path, eventId, payload } = input;

    this.send(pluginId, { type: 'dispatch', path, eventId, payload });
  }

  // A restarted or reloaded Plugin has lost its mounted pages.
  reopen(pluginId: string): void {
    for (const view of this.views.values())
      if (view.pluginId === pluginId) this.send(pluginId, view.opening);
  }

  close(): void {
    for (const view of this.views.values()) view.events.emit('close');
  }

  // A Plugin turned off ends the pages and Slot contributions Apps watch from it.
  end(pluginId: string): void {
    for (const view of this.views.values())
      if (view.pluginId === pluginId) view.events.emit('close');
  }

  // `opening.slot` is given when the view is a Slot contribution rather than a page.
  async *watch(
    pluginId: string,
    { parts, ...opening }: Omit<Open, 'type'> & { parts?: PartVersions },
    signal: AbortSignal,
  ): AsyncGenerator<ViewMessage> {
    const view = this.acquire(pluginId, { type: 'open', ...opening });

    try {
      yield* compatibleView(messages(view, signal), parts, (reason) =>
        this.log(`Plugin ${pluginId}: refused ${opening.path}: ${reason}`),
      );
    } finally {
      this.release(view);
    }
  }

  private acquire(pluginId: string, opening: Open): OpenView {
    const key = keyOf(pluginId, opening.path);
    const view = this.views.get(key) ?? this.open(key, pluginId, opening);

    view.watchers += 1;

    return view;
  }

  private open(key: string, pluginId: string, opening: Open): OpenView {
    const view = createView(pluginId, opening);

    this.views.set(key, view);
    this.send(pluginId, opening);

    return view;
  }

  private release(view: OpenView): void {
    view.watchers -= 1;

    if (view.watchers > 0) return;
    this.views.delete(keyOf(view.pluginId, view.path));
    this.send(view.pluginId, { type: 'close', path: view.path });
  }
}

const keyOf = (pluginId: string, path: string): string => `${pluginId}:${path}`;
