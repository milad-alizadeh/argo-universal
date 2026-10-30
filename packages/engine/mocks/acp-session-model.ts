import {
  type DelayEvent,
  type ModelFixture,
  type Vertex,
  walkGraph,
  type WalkedGraph,
} from '@repo/vitest/model-test';
import type { SnapshotFrom } from 'xstate';
import type { AcpSessionLease } from '../src/agents';
import { sessionMachine } from '../src/sessions';
import { modelEvents } from './acp-model-events';
import { canApplyLifecycleEvent } from './acp-model-filter';

export type AcpModelSnapshot = SnapshotFrom<typeof sessionMachine>;

const updateEvent = 'acp.update';

export type AcpModelEvent = ModelFixture<typeof sessionMachine>;

export function acpModelEventKey(event: AcpModelEvent | DelayEvent): string {
  return event.type === updateEvent && 'notification' in event
    ? `${event.type}:${event.notification.update.sessionUpdate}`
    : event.type;
}

interface AcpSessionModel extends WalkedGraph<
  typeof structuralMachine,
  AcpModelEvent
> {
  lease: AcpSessionLease;
}

const structuralMachine = sessionMachine.provide({
  actions: { routeSubagentUpdate: (): void => {} },
});

type ModelEntry = 'new' | 'existing' | 'opened';

// The extra assertions send these to a state the paths reach, each on its own.
const checkedApart = [
  'session.creationSettled',
  'session.permissionHooked',
  'session.permissionRequested',
];

export const createAcpSessionModel = (
  initial: AcpModelSnapshot,
  entry: ModelEntry = 'opened',
): AcpSessionModel => {
  const lease = requireLease(initial);
  const data = modelData(initial, entry);

  return {
    ...walkFrom(initial, startState(initial, entry, data), lease),
    lease,
  };
};

const modelVertex = (snapshot: AcpModelSnapshot): Vertex => ({
  value: snapshot.value,
  failure: snapshot.context.failure !== null,
  stored: snapshot.context.stored,
  kept: snapshot.context.kept,
  archiveRequested: snapshot.context.archiveRequested,
  feedEnded: snapshot.context.feedEnded,
});

// What every ACP walk shares; only its start differs.
const walkRules = {
  omitted: checkedApart,
  vertex: modelVertex,
  accepts: canApplyLifecycleEvent,
  eventKey: acpModelEventKey,
  limit: 10_000,
  walks: [
    { name: 'shortest path', search: 'shortest', prefixes: true } as const,
  ],
};

const walkFrom = (
  initial: AcpModelSnapshot,
  from: AcpModelSnapshot,
  lease: AcpSessionLease,
): WalkedGraph<typeof structuralMachine, AcpModelEvent> =>
  walkGraph(structuralMachine, {
    input: from.context.input,
    from,
    fixtures: modelEvents(initial, from.context, lease),
    ...walkRules,
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
