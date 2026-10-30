import type { AcpSessionLease } from '../src/agents';
import type { AcpModelEvent } from './acp-session-model';

export const modelLifecycleEvents = [
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
    output: { change: { configOptions: [], configValues: [] }, writes: [] },
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
] satisfies AcpModelEvent[];

export const modelPromptCommitted = (
  lease: AcpSessionLease,
): AcpModelEvent => ({
  type: 'xstate.done.actor.commitPrompt',
  actorId: 'commitPrompt',
  output: {
    sessionId: lease.sessionId,
    prompt: [{ type: 'text', text: 'Model prompt' }],
  },
});

export const modelPromptEvents = [
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
] satisfies AcpModelEvent[];

export const modelUsageUpdate = (lease: AcpSessionLease): AcpModelEvent => ({
  type: 'acp.update',
  notification: {
    sessionId: lease.sessionId,
    update: { sessionUpdate: 'usage_update', used: 10, size: 100 },
  },
});
