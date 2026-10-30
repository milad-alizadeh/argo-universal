import type { AcpSessionLease } from '../src/agents';
import type { AcpModelEvent, AcpModelSnapshot } from './acp-session-model';

const modelRequest = 'model-request';

export const modelConfigurationUpdate = (
  lease: AcpSessionLease,
): AcpModelEvent => ({
  type: 'acp.update',
  notification: {
    sessionId: lease.sessionId,
    update: {
      sessionUpdate: 'config_option_update',
      configOptions: [],
    },
  },
});

export const modelAgentMessage = (lease: AcpSessionLease): AcpModelEvent => ({
  type: 'acp.update',
  notification: {
    sessionId: lease.sessionId,
    update: {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: 'Model reply' },
    },
  },
});

export const modelRequestEvents = [
  {
    type: 'acp.permissionRequested',
    request: {
      requestId: modelRequest,
      toolCallId: 'model-tool',
      title: 'Model edit',
      options: [{ optionId: 'model-allow', name: 'Allow', kind: 'allow_once' }],
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
  { type: 'session.close' },
  { type: 'acp.failed', error: new Error('connection failed') },
] satisfies AcpModelEvent[];

export const modelAcpOpened = (
  initial: AcpModelSnapshot,
  lease: AcpSessionLease,
): AcpModelEvent => ({
  type: 'xstate.done.actor.openAcp',
  actorId: 'openAcp',
  output: { lease, configOptions: initial.context.configOptions },
});

export const modelCloseEvents = [
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
] satisfies AcpModelEvent[];
