import type { SnapshotFrom } from 'xstate';
import {
  getAdjacencyMap,
  getShortestPaths,
  type GraphEventFromLogic,
  type StatePath,
  type AdjacencyMap,
} from 'xstate/graph';
import type { AcpSessionLease } from '../src/services/agents';
import { RecoveryBlockedError } from '../src/services/agents';
import { sessionMachine } from '../src/services/sessions';

export type AcpModelSnapshot = SnapshotFrom<typeof sessionMachine>;
const closeEvent = 'session.close';
const modelRequest = 'model-request';
const canApplyLifecycleEvent = (
  snapshot: AcpModelSnapshot,
  event: AcpModelEvent,
): boolean => {
  const invoking = {
    'xstate.done.actor.openAcp': 'opening',
    'xstate.error.actor.openAcp': 'opening',
    'xstate.done.actor.commitPrompt': 'committing',
    'xstate.error.actor.commitPrompt': 'committing',
    'xstate.done.actor.promptAcp': 'activeTurn',
    'xstate.error.actor.promptAcp': 'activeTurn',
    'xstate.done.actor.publishTurn': 'publishing',
    'xstate.error.actor.publishTurn': 'publishing',
    'xstate.done.actor.closeAcp': 'closing',
    'xstate.error.actor.closeAcp': 'closing',
    'xstate.done.actor.awaitAcpRelease': 'retainingCleanup',
    'xstate.done.actor.publishInterruptedTurn': 'interrupting',
    'xstate.error.actor.publishInterruptedTurn': 'interrupting',
    'xstate.after.agentRestartDelay.session.open.acp.recovering': 'recovering',
    'xstate.done.actor.reopenAcp': 'reopening',
    'xstate.error.actor.reopenAcp': 'reopening',
    'xstate.after.feedFlushLimit.session.open.acp.flushing': 'flushing',
  } as const;
  if (event.type in invoking) {
    const state = Reflect.get(invoking, event.type);
    return snapshot.matches({ open: { acp: state } });
  }
  if (event.type === closeEvent) return snapshot.can({ type: closeEvent });
  if (
    event.type === 'session.prompt' ||
    event.type === 'session.cancel' ||
    event.type === 'session.storageFailing' ||
    event.type === 'session.answerPermission' ||
    event.type === 'session.answerElicitation'
  )
    return snapshot.can(event);
  return snapshot.matches({ open: 'acp' });
};
type AcpModelEvent = GraphEventFromLogic<typeof sessionMachine>;
// After a crash the model walks only the recovery loop, which keeps the crash count from multiplying every state.
const walksAfterCrash = (
  snapshot: AcpModelSnapshot,
  event: AcpModelEvent,
): boolean =>
  snapshot.context.agentCrashes.length === 0 ||
  event.type === 'acp.failed' ||
  event.type === closeEvent ||
  event.type.startsWith('xstate.');
export const createAcpSessionModel = (
  initial: AcpModelSnapshot,
): {
  paths: StatePath<AcpModelSnapshot, AcpModelEvent>[];
  model: {
    getAdjacencyMap: () => AdjacencyMap<AcpModelSnapshot, AcpModelEvent>;
  };
  lease: AcpSessionLease;
} => {
  const lease = initial.context.acpLease;
  if (!lease) throw new Error('The ACP structural model has no lease');
  const fromState = sessionMachine.resolveState({
    value: { open: { acp: 'opening' } },
    context: {
      ...initial.context,
      acpLease: null,
      stored: false,
      failure: null,
    },
  });
  /*
   * Graph transitions resolve symbolic sends against these existing child identities;
   * no actors are executed by the graph and no protocol or storage effect is proved.
   */
  Object.assign(fromState.children, initial.children);
  const events = [
    {
      type: 'session.prompt',
      turnId: 'model-turn',
      content: [{ type: 'text', text: 'Model prompt' }],
    },
    {
      type: 'xstate.done.actor.commitPrompt',
      actorId: 'commitPrompt',
      output: {
        sessionId: lease.sessionId,
        prompt: [{ type: 'text', text: 'Model prompt' }],
      },
    },
    {
      type: 'xstate.error.actor.commitPrompt',
      actorId: 'commitPrompt',
      error: new Error('commit failed'),
    },
    {
      type: 'xstate.done.actor.promptAcp',
      actorId: 'promptAcp',
      output: { stopReason: 'end_turn' },
    },
    {
      type: 'xstate.error.actor.promptAcp',
      actorId: 'promptAcp',
      error: new Error('prompt failed'),
    },
    {
      type: 'xstate.done.actor.publishTurn',
      actorId: 'publishTurn',
      output: undefined,
    },
    {
      type: 'xstate.error.actor.publishTurn',
      actorId: 'publishTurn',
      error: new Error('publication failed'),
    },
    {
      type: 'acp.update',
      notification: {
        sessionId: lease.sessionId,
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: 'Model reply' },
        },
      },
    },
    {
      type: 'acp.permissionRequested',
      request: {
        requestId: modelRequest,
        toolCallId: 'model-tool',
        title: 'Model edit',
        options: [
          { optionId: 'model-allow', name: 'Allow', kind: 'allow_once' },
        ],
      },
    },
    {
      type: 'session.answerPermission',
      requestId: modelRequest,
      optionId: 'model-allow',
    },
    {
      type: 'acp.elicitationRequested',
      request: {
        requestId: modelRequest,
        mode: 'form',
        message: 'Model question',
        requestedSchema: { properties: {} },
      },
    },
    {
      type: 'session.answerElicitation',
      requestId: modelRequest,
      action: 'decline',
    },
    { type: 'acp.requestWithdrawn', requestId: modelRequest },
    { type: 'agent.messageRejected', reason: 'Malformed model question' },
    { type: 'session.cancel' },
    { type: 'session.storageFailing' },
    { type: closeEvent },
    { type: 'acp.failed', error: new Error('connection failed') },
    { type: 'xstate.done.actor.openAcp', actorId: 'openAcp', output: lease },
    {
      type: 'xstate.done.actor.publishInterruptedTurn',
      actorId: 'publishInterruptedTurn',
      output: undefined,
    },
    {
      type: 'xstate.error.actor.publishInterruptedTurn',
      actorId: 'publishInterruptedTurn',
      error: new Error('publication failed'),
    },
    { type: 'xstate.after.agentRestartDelay.session.open.acp.recovering' },
    {
      type: 'xstate.done.actor.reopenAcp',
      actorId: 'reopenAcp',
      output: lease,
    },
    {
      type: 'xstate.error.actor.reopenAcp',
      actorId: 'reopenAcp',
      error: new Error('recovery failed'),
    },
    {
      type: 'xstate.error.actor.reopenAcp',
      actorId: 'reopenAcp',
      error: new RecoveryBlockedError(new Error('No exit')),
    },
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
    limit: 10_000,
    serializeEvent: (event: AcpModelEvent): string =>
      'error' in event && event.error instanceof RecoveryBlockedError
        ? `${event.type} blocked`
        : event.type,
    filterEvents: (snapshot: AcpModelSnapshot, event: AcpModelEvent): boolean =>
      snapshot.status === 'active' &&
      walksAfterCrash(snapshot, event) &&
      canApplyLifecycleEvent(snapshot, event),
    serializeState: (
      snapshot: AcpModelSnapshot,
      event: AcpModelEvent | undefined,
      previous?: AcpModelSnapshot,
    ): string =>
      JSON.stringify({
        value: snapshot.value,
        failure: snapshot.context.failure !== null,
        stored: snapshot.context.stored,
        feedEnded: snapshot.context.feedEnded,
        crashes: snapshot.context.agentCrashes.length,
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
