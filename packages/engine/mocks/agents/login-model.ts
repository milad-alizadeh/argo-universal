import { terminalPaths } from '@repo/vitest/model-paths';
import type { SnapshotFrom } from 'xstate';
import { getShortestPaths, type GraphEventFromLogic } from 'xstate/graph';
import {
  loginMachine,
  AgentLoginInUseError,
  type LoginAgentOutcome,
  type LoginMachineInput,
  type LoginEvent,
} from '../../src/agents/index';
export type LoginSnapshot = SnapshotFrom<typeof loginMachine>;
const failure = new Error('Agent failed');
export const openError = 'xstate.error.actor.open';
export const openDone = 'xstate.done.actor.open';
export const authenticateDone = 'xstate.done.actor.authenticate';
export const checkDone = 'xstate.done.actor.checkReady';
export const authenticateError = 'xstate.error.actor.authenticate';
export const checkError = 'xstate.error.actor.checkReady';
export const closeDone = 'xstate.done.actor.close';
export const closeError = 'xstate.error.actor.close';
const events = [
  { type: 'choose', methodId: 'advertised-method' },
  { type: 'request' },
  { type: 'answer' },
  { type: 'finish', outcome: 'cancelled' },
  { type: 'finish', outcome: 'timed-out' },
  { type: openDone, actorId: 'open', output: true },
  { type: openDone, actorId: 'open', output: false },
  { type: openError, actorId: 'open', error: failure },
  { type: openError, actorId: 'open', error: new AgentLoginInUseError('Busy') },
  { type: authenticateDone, actorId: 'authenticate', output: undefined },
  { type: authenticateError, actorId: 'authenticate', error: failure },
  {
    type: checkDone,
    actorId: 'checkReady',
    output: { status: 'ready' as const },
  },
  {
    type: checkDone,
    actorId: 'checkReady',
    output: { status: 'account-rejected' as const },
  },
  {
    type: checkDone,
    actorId: 'checkReady',
    output: { status: 'authentication-required' as const },
  },
  { type: checkError, actorId: 'checkReady', error: failure },
  { type: closeDone, actorId: 'close', output: undefined },
  { type: closeError, actorId: 'close', error: failure },
] satisfies GraphEventFromLogic<typeof loginMachine>[];
export type LoginGraphEvent = (typeof events)[number];
export const key = (snapshot: LoginSnapshot): string =>
  JSON.stringify({ value: snapshot.value, outcome: snapshot.context.outcome });
export const input: LoginMachineInput = {
  open: (): Promise<boolean> => Promise.resolve(true),
  authenticate: (): Promise<void> => Promise.resolve(),
  checkReady: (): Promise<LoginAgentOutcome> =>
    Promise.resolve({ status: 'ready' as const }),
  close: (): Promise<void> => Promise.resolve(),
  abort: (): void => {},
  fail: (): void => {},
};
const publicEvents = new Set(['choose', 'request', 'answer', 'finish']);
const isPublicEvent = (
  event: LoginGraphEvent,
): event is Extract<LoginGraphEvent, LoginEvent> =>
  publicEvents.has(event.type);
const actorStates = new Map<
  string,
  'starting' | 'authenticating' | 'checking' | 'closing'
>([
  ['open', 'starting'],
  ['authenticate', 'authenticating'],
  ['checkReady', 'checking'],
  ['close', 'closing'],
]);
const actorEventAllowed = (
  snapshot: LoginSnapshot,
  actorId: string,
): boolean => {
  const state = actorStates.get(actorId);
  return state ? snapshot.matches(state) : false;
};
const filterEvents = (
  snapshot: LoginSnapshot,
  event: LoginGraphEvent,
): boolean => {
  if (snapshot.status !== 'active') return false;
  if (isPublicEvent(event)) return snapshot.can(event);
  return actorEventAllowed(snapshot, event.actorId);
};

export const options = {
  input,
  events,
  filterEvents,
  serializeState: (
    snapshot: LoginSnapshot,
    event?: LoginGraphEvent,
    previous?: LoginSnapshot,
  ): string =>
    JSON.stringify({
      key: key(snapshot),
      via: event && `${previous && key(previous)} ${event.type}`,
    }),
};
export const paths = terminalPaths(getShortestPaths(loginMachine, options));
