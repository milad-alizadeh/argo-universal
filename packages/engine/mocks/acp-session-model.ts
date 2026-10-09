import type { SnapshotFrom } from 'xstate';
import {
  getAdjacencyMap,
  getShortestPaths,
  type GraphEventFromLogic,
  type StatePath,
  type AdjacencyMap,
} from 'xstate/graph';
import type { AcpSessionLease } from '../src/services/agents';
import { sessionMachine } from '../src/services/sessions';

export type AcpModelSnapshot = SnapshotFrom<typeof sessionMachine>;
const closeEvent = 'session.close';
const canLifecycleEvent = (
  snapshot: AcpModelSnapshot,
  event: AcpModelEvent,
): boolean => {
  const invoking = {
    'xstate.done.actor.openAcp': 'opening',
    'xstate.error.actor.openAcp': 'opening',
    'xstate.done.actor.closeAcp': 'closing',
    'xstate.error.actor.closeAcp': 'closing',
    'xstate.done.actor.awaitAcpRelease': 'retainingCleanup',
    'xstate.after.feedFlushLimit.session.open.acp.flushing': 'flushing',
  } as const;
  if (event.type in invoking) {
    const state = Reflect.get(invoking, event.type);
    return (
      JSON.stringify(snapshot.value) ===
      JSON.stringify({ open: { acp: state } })
    );
  }
  if (event.type === closeEvent) return snapshot.can({ type: closeEvent });
  return snapshot.matches({ open: 'acp' });
};
type AcpModelEvent = GraphEventFromLogic<typeof sessionMachine>;
export const acpModel = (
  initial: AcpModelSnapshot,
): {
  paths: StatePath<AcpModelSnapshot, AcpModelEvent>[];
  model: {
    getAdjacencyMap: () => AdjacencyMap<AcpModelSnapshot, AcpModelEvent>;
  };
  lease: AcpSessionLease;
} => {
  const lease = initial.context.acpLease;
  if (!lease) throw new Error('The public ACP Session has no lease');
  const fromState = sessionMachine.resolveState({
    value: { open: { acp: 'opening' } },
    context: {
      ...initial.context,
      acpLease: null,
      stored: false,
      failure: null,
    },
  });
  Object.assign(fromState.children, initial.children);
  const events = [
    { type: closeEvent },
    { type: 'acp.failed', error: new Error('connection failed') },
    { type: 'xstate.done.actor.openAcp', actorId: 'openAcp', output: lease },
    {
      type: 'xstate.error.actor.openAcp',
      actorId: 'openAcp',
      error: new Error('open failed'),
    },
    {
      type: 'xstate.done.actor.closeAcp',
      actorId: 'closeAcp',
      output: undefined,
    },
    {
      type: 'xstate.error.actor.closeAcp',
      actorId: 'closeAcp',
      error: new Error('close failed'),
    },
    {
      type: 'xstate.done.actor.awaitAcpRelease',
      actorId: 'awaitAcpRelease',
      output: undefined,
    },
    { type: 'xstate.done.actor.feed', actorId: 'feed', output: undefined },
    {
      type: 'xstate.error.actor.feed',
      actorId: 'feed',
      error: new Error('Feed failed'),
    },
    { type: 'xstate.after.feedFlushLimit.session.open.acp.flushing' },
  ] satisfies AcpModelEvent[];
  const options = {
    fromState,
    events,
    limit: 1000,
    serializeEvent: (event: AcpModelEvent): string => event.type,
    filterEvents: (snapshot: AcpModelSnapshot, event: AcpModelEvent): boolean =>
      snapshot.status === 'active' && canLifecycleEvent(snapshot, event),
    serializeState: (
      snapshot: AcpModelSnapshot,
      event: AcpModelEvent | undefined,
      previous?: AcpModelSnapshot,
    ): string =>
      JSON.stringify({
        value: snapshot.value,
        failure: snapshot.context.failure !== null,
        stored: snapshot.context.stored,
        via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
      }),
  };
  return {
    paths: getShortestPaths(sessionMachine, options),
    model: {
      getAdjacencyMap: (): AdjacencyMap<AcpModelSnapshot, AcpModelEvent> =>
        getAdjacencyMap(sessionMachine, options),
    },
    lease,
  };
};
