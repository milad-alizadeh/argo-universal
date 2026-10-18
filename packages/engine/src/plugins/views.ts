import { EventEmitter, on } from 'node:events';
import type {
  PluginDispatchInput,
  ViewMessage,
  WireNode,
} from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import type { PluginEvent } from './runtime-protocol';

type Open = Extract<PluginEvent, { type: 'open' }>;

type ViewEvents = EventEmitter<{ message: [ViewMessage]; close: [] }>;

interface OpenView {
  pluginId: string;
  path: string;
  // What mounts the view in the Plugin, again after a restart.
  opening: Open;
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

    if (view) update(view, message);
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

  // `opening.slot` is given when the view is a Slot contribution rather than a page.
  async *watch(
    pluginId: string,
    opening: Omit<Open, 'type'>,
    signal: AbortSignal,
  ): AsyncGenerator<ViewMessage> {
    const view = this.acquire(pluginId, { type: 'open', ...opening });

    try {
      yield* messages(view, signal);
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

function current(view: OpenView, message: ViewMessage): ViewMessage {
  if (message.type === 'snapshot')
    return { type: 'snapshot', revision: view.revision, root: message.root };

  return { type: 'patch', revision: view.revision, ops: message.ops };
}

function createView(pluginId: string, opening: Open): OpenView {
  const events: ViewEvents = new EventEmitter();

  events.setMaxListeners(0);

  return {
    pluginId,
    path: opening.path,
    opening,
    root: null,
    revision: 0,
    watchers: 0,
    events,
  };
}

function nextRoot(
  root: WireNode | null,
  message: ViewMessage,
): WireNode | null {
  if (message.type === 'snapshot') return message.root;

  return root && applyPatch(root, message.ops);
}

const snapshotOf = (view: OpenView): ViewMessage[] =>
  view.root
    ? [{ type: 'snapshot', revision: view.revision, root: view.root }]
    : [];

// Aborting a subscription ends its stream quietly.
async function* untilAborted<T>(
  source: AsyncIterable<T>,
  signal: AbortSignal,
): AsyncGenerator<T> {
  try {
    yield* source;
  } catch (error) {
    if (!signal.aborted) throw error;
  }
}

// The stream starts listening before the snapshot is handed out, so no patch falls between the two.
async function* messages(
  view: OpenView,
  signal: AbortSignal,
): AsyncGenerator<ViewMessage> {
  const stream = on(view.events, 'message', { signal, close: ['close'] });

  try {
    yield* snapshotOf(view);

    for await (const [message] of untilAborted(stream, signal)) yield message;
  } finally {
    await stream.return?.();
  }
}

function update(view: OpenView, message: ViewMessage): void {
  const root = nextRoot(view.root, message);

  if (!root) return;
  view.root = root;
  view.revision += 1;
  view.events.emit('message', current(view, message));
}
