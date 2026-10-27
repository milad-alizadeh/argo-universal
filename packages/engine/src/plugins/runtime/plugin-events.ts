import type { ActivatedPlugin } from '../access/plugin-access';
import type { HostConnection } from '../host/connection';
import {
  crashed,
  notStarted,
  type PluginEntry,
  type PluginStatus,
} from '../protocol/runtime';

// What one Plugin's lifecycle reaches outside itself.
export type RuntimePluginInput = {
  entry: Omit<PluginEntry, 'generation'>;
  host: Pick<HostConnection, 'activate' | 'stop'>;
  clockStart: () => number | undefined;
  // True while any Turn may be writing the Plugin's sources (ADR-0027).
  deferReload: () => boolean;
  // Grants the Plugin its Capabilities as each worker loads; `release` takes them away again.
  grant: (plugin: ActivatedPlugin, generation: number) => void;
  release: () => void;
  changed: (status: PluginStatus) => void;
  // Settles every activation waiting on the Plugin.
  answer: (status: PluginStatus) => void;
  log: (line: string) => void;
};

export type Loaded = { type: 'build.loaded'; source: string; version: string };

export type BuildEvent = Loaded | { type: 'build.failed'; error: string };

type ReceivedEvent =
  | BuildEvent
  | { type: 'plugin.activate'; granted: ActivatedPlugin }
  | { type: 'worker.status'; status: PluginStatus; generation: number }
  | { type: 'worker.failed'; error: string }
  | { type: 'host.crashed'; message: string }
  | { type: 'plugin.stop' };

export type PluginEvent =
  | ReceivedEvent
  | { type: 'plugin.restart' }
  | { type: 'turns.ended' }
  | { type: 'plugin.close' };

export type PluginContext = RuntimePluginInput & {
  granted: ActivatedPlugin;
  // Each worker load and each stop moves it on, so a status from an earlier worker is ignored.
  generation: number;
  source: { text: string; version: string };
  buildError: string | null;
  // A dev build that landed while a Turn ran; it applies once Turns end.
  deferred: BuildEvent | null;
  status: PluginStatus;
};

type ReceivedType = ReceivedEvent['type'];

type EventOf<Type extends ReceivedType> = Extract<
  ReceivedEvent,
  { type: Type }
> & { type: Type };

type StatusOf<Type extends ReceivedType> = (
  event: EventOf<Type>,
  context: PluginContext,
) => PluginStatus;

type ReceivedStatuses = { [Type in ReceivedType]: StatusOf<Type> };

// The status each event that settles activation reports.
const statusOf: ReceivedStatuses = {
  'build.loaded': () => notStarted,
  'build.failed': ({ error }) => crashed(error),
  'plugin.activate': (_, { buildError }) => crashed(buildError ?? ''),
  'worker.status': ({ status }) => status,
  'worker.failed': ({ error }) => crashed(error),
  'host.crashed': ({ message }) => crashed(message),
  'plugin.stop': () => notStarted,
};

export const received = <Type extends ReceivedType>(
  event: EventOf<Type>,
  context: PluginContext,
): PluginStatus => statusOf[event.type](event, context);

export const settles = (event: PluginEvent): event is ReceivedEvent =>
  Object.hasOwn(statusOf, event.type);
