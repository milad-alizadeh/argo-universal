import {
  getAdjacencyMap,
  getShortestPaths,
  type GraphEventFromLogic,
} from '@repo/vitest/model-graph';
import type { SnapshotFrom } from 'xstate';
import type { StatePath, AdjacencyMap } from 'xstate/graph';
import type { AcpSessionLease } from '../src/agents';
import { sessionMachine } from '../src/sessions';
import { modelEvents } from './acp-model-events';
import { canApplyLifecycleEvent } from './acp-model-filter';

export type AcpModelSnapshot = SnapshotFrom<typeof sessionMachine>;

const updateEvent = 'acp.update';

export type AcpModelEvent = GraphEventFromLogic<typeof sessionMachine>;

export function acpModelEventKey(event: AcpModelEvent): string {
  return event.type === updateEvent
    ? `${event.type}:${event.notification.update.sessionUpdate}`
    : event.type;
}

interface AcpSessionModel {
  paths: StatePath<AcpModelSnapshot, AcpModelEvent>[];
  model: {
    getAdjacencyMap: () => AdjacencyMap<AcpModelSnapshot, AcpModelEvent>;
  };
  lease: AcpSessionLease;
}

const structuralMachine = sessionMachine.provide({
  actions: { routeSubagentUpdate: (): void => {} },
});

type ModelEntry = 'new' | 'existing' | 'opened';

type ModelOptions = {
  fromState: AcpModelSnapshot;
  events: AcpModelEvent[];
  limit: number;
  serializeEvent: typeof acpModelEventKey;
  filterEvents: (snapshot: AcpModelSnapshot, event: AcpModelEvent) => boolean;
  serializeState: (
    snapshot: AcpModelSnapshot,
    event: AcpModelEvent | undefined,
    previous?: AcpModelSnapshot,
  ) => string;
};

export const createAcpSessionModel = (
  initial: AcpModelSnapshot,
  entry: ModelEntry = 'opened',
): AcpSessionModel => {
  const lease = requireLease(initial);
  const data = modelData(initial, entry);
  const fromState = startState(initial, entry, data);
  const options = modelOptions(fromState, modelEvents(initial, data, lease));

  return {
    paths: getShortestPaths(structuralMachine, options),
    model: adjacencyModel(options),
    lease,
  };
};

const adjacencyModel = (options: ModelOptions): AcpSessionModel['model'] => ({
  getAdjacencyMap: (): AdjacencyMap<AcpModelSnapshot, AcpModelEvent> =>
    getAdjacencyMap(structuralMachine, options),
});

const requireLease = (initial: AcpModelSnapshot): AcpSessionLease => {
  const lease = initial.context.acpLease;

  if (!lease) throw new Error('The ACP structural model has no lease');

  return lease;
};

const modelData = (
  initial: AcpModelSnapshot,
  entry: ModelEntry,
): AcpModelSnapshot['context'] => {
  const input =
    entry === 'existing'
      ? { ...initial.context.input, kind: 'existing' as const }
      : initial.context.input;

  return {
    ...initial.context,
    input,
    acpLease: null,
    stored: entry === 'existing',
  };
};

const entryStates = {
  new: 'creating',
  existing: 'loading',
  opened: { open: { acp: 'opening' } },
} as const;

const startState = (
  initial: AcpModelSnapshot,
  entry: ModelEntry,
  data: AcpModelSnapshot['context'],
): AcpModelSnapshot => {
  const fromState = structuralMachine.resolveState({
    value: entryStates[entry],
    context: { ...data, failure: null },
  });

  // Graph transitions resolve symbolic sends against these existing child identities; no actors run.
  Object.assign(fromState.children, initial.children);

  return fromState;
};

const modelOptions = (
  fromState: AcpModelSnapshot,
  events: AcpModelEvent[],
): ModelOptions => ({
  fromState,
  events,
  limit: 10_000,
  serializeEvent: acpModelEventKey,
  filterEvents: (snapshot, event): boolean =>
    snapshot.status === 'active' && canApplyLifecycleEvent(snapshot, event),
  serializeState: modelStateKey,
});

const modelStateKey = (
  snapshot: AcpModelSnapshot,
  event: AcpModelEvent | undefined,
  previous?: AcpModelSnapshot,
): string =>
  JSON.stringify({
    value: snapshot.value,
    failure: snapshot.context.failure !== null,
    stored: snapshot.context.stored,
    kept: snapshot.context.kept,
    archiveRequested: snapshot.context.archiveRequested,
    feedEnded: snapshot.context.feedEnded,
    via:
      event && `${JSON.stringify(previous?.value)} ${acpModelEventKey(event)}`,
  });
