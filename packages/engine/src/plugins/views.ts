import { EventEmitter, on } from 'node:events';
import {
  applyPatch,
  type PluginDispatchInput,
  type ViewMessage,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import type { PluginEvent } from './runtime-protocol';

type ViewEvents = EventEmitter<{ message: [ViewMessage]; close: [] }>;

interface OpenView {
  pluginId: string;
  path: string;
  root: WireNode | null;
  // Counted here, not by the worker, so a reloaded Plugin's fresh snapshot is never older than what an App already holds.
  revision: number;
  watchers: number;
  events: ViewEvents;
}

/*
 * The pages Apps watch: each Plugin page is mounted while at least one subscription is open,
 * and every watcher gets the current snapshot first, then the patches that follow.
 */
export class PluginViews {
  private readonly views = new Map<string, OpenView>();

  constructor(
    private readonly send: (pluginId: string, event: PluginEvent) => void,
  ) {}

  receive(pluginId: string, path: string, message: ViewMessage): void {
    const view = this.views.get(keyOf(pluginId, path));

    if (!view) return;

    if (message.type === 'snapshot') view.root = message.root;
    else if (view.root) view.root = applyPatch(view.root, message.ops);
    else return;

    view.revision += 1;
    view.events.emit('message', current(view, message));
  }

  dispatch(input: PluginDispatchInput): void {
    const { pluginId, path, eventId, payload } = input;

    this.send(pluginId, { type: 'dispatch', path, eventId, payload });
  }

  // A restarted or reloaded Plugin has lost its mounted pages.
  reopen(pluginId: string): void {
    for (const view of this.views.values())
      if (view.pluginId === pluginId)
        this.send(pluginId, { type: 'open', path: view.path });
  }

  close(): void {
    for (const view of this.views.values()) view.events.emit('close');
  }

  async *watch(
    pluginId: string,
    path: string,
    signal: AbortSignal,
  ): AsyncGenerator<ViewMessage> {
    const view = this.acquire(pluginId, path);
    const stream = on(view.events, 'message', { signal, close: ['close'] });

    try {
      if (view.root)
        yield { type: 'snapshot', revision: view.revision, root: view.root };

      for await (const [message] of stream) yield message;
    } catch (error) {
      if (!signal.aborted) throw error;
    } finally {
      await stream.return?.();
      this.release(view);
    }
  }

  private acquire(pluginId: string, path: string): OpenView {
    const key = keyOf(pluginId, path);
    let view = this.views.get(key);

    if (!view) {
      const events: ViewEvents = new EventEmitter();
      events.setMaxListeners(0);
      view = {
        pluginId,
        path,
        root: null,
        revision: 0,
        watchers: 0,
        events,
      };
      this.views.set(key, view);
      this.send(pluginId, { type: 'open', path });
    }
    view.watchers += 1;

    return view;
  }

  private release(view: OpenView): void {
    view.watchers -= 1;

    if (view.watchers > 0) return;
    this.views.delete(keyOf(view.pluginId, view.path));
    this.send(view.pluginId, { type: 'close', path: view.path });
  }
}

const keyOf = (pluginId: string, path: string): string =>
  `${pluginId}:${path}`;

function current(view: OpenView, message: ViewMessage): ViewMessage {
  if (message.type === 'snapshot')
    return { type: 'snapshot', revision: view.revision, root: message.root };

  return { type: 'patch', revision: view.revision, ops: message.ops };
}
