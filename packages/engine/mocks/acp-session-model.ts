import {
  getAdjacencyMap,
  getShortestPaths,
  type GraphEventFromLogic,
} from '@repo/vitest/model-graph';
import type { SnapshotFrom } from 'xstate';
import type { StatePath, AdjacencyMap } from 'xstate/graph';
import type { AcpSessionLease } from '../src/agents';
import { sessionMachine } from '../src/sessions';

export type AcpModelSnapshot = SnapshotFrom<typeof sessionMachine>;

const closeEvent = 'session.close';

const updateEvent = 'acp.update';

const modelRequest = 'model-request';

const canApplyLifecycleEvent = (
  snapshot: AcpModelSnapshot,
  event: AcpModelEvent,
): boolean => {
  const roots = new Map(
    Object.entries({
      'xstate.done.actor.createCheckout': 'creating',
      'xstate.error.actor.createCheckout': 'creating',
      'xstate.after.checkoutLimit.session.creating': 'creating',
      'xstate.done.actor.loadSession': 'loading',
      'xstate.error.actor.loadSession': 'loading',
      'xstate.done.actor.removeCheckout': 'removingCheckout',
      'xstate.error.actor.removeCheckout': 'removingCheckout',
      'xstate.done.actor.undoArchive': 'undoingArchive',
      'xstate.error.actor.undoArchive': 'undoingArchive',
      'xstate.after.checkoutRemovalDelay.session.archived': 'archived',
      'xstate.done.actor.discardSession': 'discarding',
      'xstate.error.actor.discardSession': 'discarding',
    } as const),
  );

  const root = roots.get(event.type);

  if (root) return snapshot.matches(root);

  const invoking = new Map(
    Object.entries({
      'xstate.done.actor.saveArchive': 'archiving',
      'xstate.error.actor.saveArchive': 'archiving',
      'xstate.done.actor.openAcp': 'opening',
      'xstate.error.actor.openAcp': 'opening',
      'xstate.done.actor.restoreAcpConfiguration': 'restoring',
      'xstate.error.actor.restoreAcpConfiguration': 'restoring',
      'xstate.done.actor.configureAcp': 'configuring',
      'xstate.error.actor.configureAcp': 'configuring',
      'xstate.done.actor.commitPrompt': 'committing',
      'xstate.error.actor.commitPrompt': 'committing',
      'xstate.done.actor.cancelAcp': { activeTurn: { cancelling: 'sending' } },
      'xstate.error.actor.cancelAcp': { activeTurn: { cancelling: 'sending' } },
      'xstate.done.actor.promptAcp': 'activeTurn',
      'xstate.error.actor.promptAcp': 'activeTurn',
      'xstate.done.actor.publishTurn': 'publishing',
      'xstate.error.actor.publishTurn': 'publishing',
      'xstate.done.actor.closeAcp': 'closing',
      'xstate.error.actor.closeAcp': 'closing',
      'xstate.done.actor.publishInterruptedTurn': 'interrupting',
      'xstate.error.actor.publishInterruptedTurn': 'interrupting',
      'xstate.after.feedFlushLimit.session.open.acp.flushing': 'flushing',
    } as const),
  );

  const state = invoking.get(event.type);

  if (state) return snapshot.matches({ open: { acp: state } });

  if (event.type === closeEvent) return snapshot.can({ type: closeEvent });

  if (
    event.type === 'session.archive' ||
    event.type === 'session.unarchive' ||
    event.type === 'session.shutdown' ||
    event.type === 'session.prompt' ||
    event.type === 'session.cancel' ||
    event.type === 'session.setConfigOption' ||
    event.type === 'session.storageFailing' ||
    event.type === 'session.answerPermission' ||
    event.type === 'session.answerElicitation'
  )
    return snapshot.can(event);

  return snapshot.matches({ open: 'acp' });
};

type AcpModelEvent = GraphEventFromLogic<typeof sessionMachine>;

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

export const createAcpSessionModel = (
  initial: AcpModelSnapshot,
  entry: 'new' | 'existing' | 'opened' = 'opened',
): AcpSessionModel => {
  const lease = initial.context.acpLease;

  if (!lease) throw new Error('The ACP structural model has no lease');

  const input =
    entry === 'existing'
      ? { ...initial.context.input, kind: 'existing' as const }
      : initial.context.input;

  const data = {
    ...initial.context,
    input,
    acpLease: null,
    stored: entry === 'existing',
  };

  const entryStates = {
    new: 'creating',
    existing: 'loading',
    opened: { open: { acp: 'opening' } },
  } as const;

  const fromState = structuralMachine.resolveState({
    value: entryStates[entry],
    context: { ...data, failure: null },
  });

  /*
   * Graph transitions resolve symbolic sends against these existing child identities;
   * no actors are executed by the graph and no protocol or storage effect is proved.
   */
  Object.assign(fromState.children, initial.children);

  const events = [
    {
      type: 'agent.shellChanged',
      shell: {
        id: 'model-shell',
        sessionId: initial.context.sessionId,
        toolCallId: 'model-tool',
        command: 'fixture',
        cwd: '/fixture',
        status: 'running',
        exitCode: null,
        startedAt: 0,
        endedAt: null,
        outputBlobId: null,
      },
    },
    {
      type: updateEvent,
      notification: {
        sessionId: lease.sessionId,
        update: {
          sessionUpdate: 'subagent_update',
          sessionId: 'model-subagent',
        },
      },
    },
    {
      type: 'xstate.done.actor.createCheckout',
      actorId: 'createCheckout',
      output: data,
    },
    {
      type: 'xstate.error.actor.createCheckout',
      actorId: 'createCheckout',
      error: new Error('Checkout failed'),
    },
    { type: 'xstate.after.checkoutLimit.session.creating' },
    {
      type: 'xstate.done.actor.loadSession',
      actorId: 'loadSession',
      output: { ...data, kept: true },
    },
    {
      type: 'xstate.error.actor.loadSession',
      actorId: 'loadSession',
      error: new Error('Session load failed'),
    },
    {
      type: 'xstate.done.actor.discardSession',
      actorId: 'discardSession',
      output: undefined,
    },
    {
      type: 'xstate.error.actor.discardSession',
      actorId: 'discardSession',
      error: new Error('Discard failed'),
    },
    { type: 'session.archive' },
    { type: 'session.unarchive' },
    { type: 'session.shutdown' },
    {
      type: 'xstate.done.actor.saveArchive',
      actorId: 'saveArchive',
      output: undefined,
    },
    {
      type: 'xstate.error.actor.saveArchive',
      actorId: 'saveArchive',
      error: new Error('archive failed'),
    },
    {
      type: 'xstate.done.actor.undoArchive',
      actorId: 'undoArchive',
      output: undefined,
    },
    {
      type: 'xstate.error.actor.undoArchive',
      actorId: 'undoArchive',
      error: new Error('Undo failed'),
    },
    {
      type: 'xstate.done.actor.removeCheckout',
      actorId: 'removeCheckout',
      output: undefined,
    },
    {
      type: 'xstate.error.actor.removeCheckout',
      actorId: 'removeCheckout',
      error: new Error('removal failed'),
    },
    { type: 'xstate.after.checkoutRemovalDelay.session.archived' },
    { type: 'session.cancel' },
    {
      type: 'xstate.done.actor.cancelAcp',
      actorId: 'cancelAcp',
      output: undefined,
    },
    {
      type: 'xstate.error.actor.cancelAcp',
      actorId: 'cancelAcp',
      error: new Error('cancel failed'),
    },
    {
      type: 'xstate.done.actor.restoreAcpConfiguration',
      actorId: 'restoreAcpConfiguration',
      output: [],
    },
    {
      type: 'xstate.error.actor.restoreAcpConfiguration',
      actorId: 'restoreAcpConfiguration',
      error: new Error('Restoration failed'),
    },
    { type: 'session.setConfigOption', configId: 'fast', value: true },
    {
      type: 'xstate.done.actor.configureAcp',
      actorId: 'configureAcp',
      output: [],
    },
    {
      type: 'xstate.error.actor.configureAcp',
      actorId: 'configureAcp',
      error: new Error('configuration failed'),
    },
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
      type: updateEvent,
      notification: {
        sessionId: lease.sessionId,
        update: { sessionUpdate: 'usage_update', used: 10, size: 100 },
      },
    },
    {
      type: updateEvent,
      notification: {
        sessionId: lease.sessionId,
        update: {
          sessionUpdate: 'config_option_update',
          configOptions: [],
        },
      },
    },
    {
      type: updateEvent,
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
    { type: 'session.storageFailing' },
    { type: closeEvent },
    { type: 'acp.failed', error: new Error('connection failed') },
    {
      type: 'xstate.done.actor.openAcp',
      actorId: 'openAcp',
      output: { lease, configOptions: initial.context.configOptions },
    },
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
    serializeEvent: acpModelEventKey,
    filterEvents: (snapshot: AcpModelSnapshot, event: AcpModelEvent): boolean =>
      snapshot.status === 'active' && canApplyLifecycleEvent(snapshot, event),
    serializeState: (
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
          event &&
          `${JSON.stringify(previous?.value)} ${acpModelEventKey(event)}`,
      }),
  };

  return {
    paths: getShortestPaths(structuralMachine, options),
    model: {
      getAdjacencyMap: (): AdjacencyMap<AcpModelSnapshot, AcpModelEvent> =>
        getAdjacencyMap(structuralMachine, options),
    },
    lease,
  };
};
