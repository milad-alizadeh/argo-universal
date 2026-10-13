import type { SessionConfigOption, SessionNewInput } from '@repo/contracts';
import { recordedSessionOptions } from '@repo/mocks/app';
import { terminalPaths } from '@repo/vitest/model-paths';
import type { SnapshotFrom } from 'xstate';
import { type GraphEventFromLogic, getShortestPaths } from 'xstate/graph';
import type { ConfigurationChange, SavedChoices } from '#features/composer';
import {
  type EmptySessionEvent,
  type EmptySessionPorts,
  emptySessionMachine,
} from '../src/features/sessions/state/empty-session-machine';

export type EmptySessionSnapshot = SnapshotFrom<typeof emptySessionMachine>;

const agent = 'agent-one';
const inputFor = (projectId: string): SessionNewInput => ({
  projectId,
  agent,
  checkout: { type: 'main' },
  configOptions: [],
  prompt: [],
});
export const first = inputFor('project-a');
const second = inputFor('project-b');
export const prompt = [
  { type: 'text' as const, text: 'Fix the flaky login test' },
];
export const options: SessionConfigOption[] = recordedSessionOptions(agent);
const failure = new Error('The Agent did not start');

// Each saved choice the Session doesn't hold yet, in the order saved.
export const nextChange = (
  _options: SessionConfigOption[],
  saved: SavedChoices,
  applied: readonly string[],
): ConfigurationChange | undefined =>
  Object.entries(saved)
    .map(([configId, value]) => ({ configId, value }))
    .find(({ configId }) => !applied.includes(configId));

export const actorIds = ['open', 'close', 'setConfigOption', 'prompt'] as const;
export type ActorId = (typeof actorIds)[number];
export const delayDone = 'xstate.after.choiceDebounce.emptySession.waiting';
export const promptShowTimedOut =
  'xstate.after.promptShowTimeout.emptySession.open.showingPrompt';
export const done = (id: ActorId): `xstate.done.actor.${ActorId}` =>
  `xstate.done.actor.${id}`;
export const failed = (id: ActorId): `xstate.error.actor.${ActorId}` =>
  `xstate.error.actor.${id}`;
const choices = 'choices.changed';
const loaded = 'options.loaded';
const showsPrompt = 'feed.showsPrompt';

const events = [
  { type: choices, input: first, connected: true },
  { type: choices, input: second, connected: true },
  { type: choices, input: first, connected: false },
  { type: loaded, configOptions: options, saved: { model: 'm' } },
  { type: loaded, configOptions: options, saved: {} },
  { type: 'send', prompt },
  { type: 'retry' },
  { type: showsPrompt },
  { type: delayDone },
  { type: promptShowTimedOut },
  { type: done('open'), actorId: 'open', output: { sessionId: 'session-1' } },
  { type: done('close'), actorId: 'close', output: undefined },
  {
    type: done('setConfigOption'),
    actorId: 'setConfigOption',
    output: options,
  },
  { type: done('prompt'), actorId: 'prompt', output: undefined },
  ...actorIds.map((id) => ({ type: failed(id), actorId: id, error: failure })),
] satisfies GraphEventFromLogic<typeof emptySessionMachine>[];
export type EmptySessionGraphEvent = (typeof events)[number];

const graphPorts: EmptySessionPorts = {
  open: () => Promise.resolve({ sessionId: 'session-1' }),
  close: () => Promise.resolve(),
  setConfigOption: () => Promise.resolve(options),
  prompt: () => Promise.resolve(),
  handOff: () => {},
  nextChange,
};

const choiceNames = new Map([
  [JSON.stringify(first), 'first'],
  [JSON.stringify(second), 'second'],
]);
const choiceName = (key: string | undefined): string =>
  choiceNames.get(key ?? '') ?? 'none';

// What the machine counts as the same state.
export const key = ({ value, context }: EmptySessionSnapshot): string =>
  JSON.stringify({
    value,
    choices: choiceName(context.input && JSON.stringify(context.input)),
    opened: choiceName(context.openedKey),
    connected: context.connected,
    session: String(context.sessionId),
    applied: context.applied,
    saved: context.saved,
    pending: context.pendingPrompt !== undefined,
    shown: context.promptShown,
    error: String(context.error),
  });

const publicTypes = new Set<string>([
  choices,
  loaded,
  'send',
  'retry',
  showsPrompt,
]);
export const isPublicEvent = (
  event: EmptySessionGraphEvent,
): event is Extract<EmptySessionGraphEvent, EmptySessionEvent> =>
  publicTypes.has(event.type);

type Check = (snapshot: EmptySessionSnapshot) => boolean;
const runs: Record<ActorId, Check> = {
  open: (snapshot) => snapshot.matches('opening'),
  close: (snapshot) => snapshot.matches('closing'),
  setConfigOption: (snapshot) =>
    snapshot.matches({ open: { applyingRemembered: 'setting' } }),
  prompt: (snapshot) => snapshot.matches({ open: 'prompting' }),
};
const machineEventChecks = new Map<string, Check>([
  [delayDone, (snapshot): boolean => snapshot.matches('waiting')],
  [
    promptShowTimedOut,
    (snapshot): boolean => snapshot.matches({ open: 'showingPrompt' }),
  ],
  ...actorIds.flatMap((id): [string, Check][] => [
    [done(id), runs[id]],
    [failed(id), runs[id]],
  ]),
]);

const filterEvents = (
  snapshot: EmptySessionSnapshot,
  event: EmptySessionGraphEvent,
): boolean => {
  if (snapshot.status !== 'active') return false;
  if (isPublicEvent(event)) return snapshot.can(event);
  return machineEventChecks.get(event.type)?.(snapshot) === true;
};

export const graphOptions = {
  input: graphPorts,
  events,
  filterEvents,
  serializeState: (
    snapshot: EmptySessionSnapshot,
    event?: EmptySessionGraphEvent,
    previous?: EmptySessionSnapshot,
  ): string =>
    JSON.stringify({
      key: key(snapshot),
      via: event && `${previous && key(previous)} ${event.type}`,
    }),
};
export const paths = terminalPaths(
  getShortestPaths(emptySessionMachine, graphOptions),
);
