import type { AcpSessionLease } from '../src/agents';
import type { AcpModelEvent, AcpModelSnapshot } from './acp-session-model';

const shellFixture = {
  id: 'model-shell',
  toolCallId: 'model-tool',
  command: 'fixture',
  cwd: '/fixture',
  status: 'running' as const,
  exitCode: null,
  startedAt: 0,
  endedAt: null,
  outputBlobId: null,
};

export const modelShellChanged = (
  initial: AcpModelSnapshot,
): AcpModelEvent => ({
  type: 'agent.shellChanged',
  shell: { ...shellFixture, sessionId: initial.context.sessionId },
});

export const modelSubagentUpdate = (lease: AcpSessionLease): AcpModelEvent => ({
  type: 'acp.update',
  notification: {
    sessionId: lease.sessionId,
    update: {
      sessionUpdate: 'subagent_update',
      sessionId: 'model-subagent',
    },
  },
});

export const modelCheckoutCreated = (
  data: AcpModelSnapshot['context'],
): AcpModelEvent => ({
  type: 'xstate.done.actor.createCheckout',
  actorId: 'createCheckout',
  output: data,
});

export const modelCheckoutFailures = [
  {
    type: 'xstate.error.actor.createCheckout',
    actorId: 'createCheckout',
    error: new Error('Checkout failed'),
  },
] satisfies AcpModelEvent[];

export const modelSessionLoaded = (
  data: AcpModelSnapshot['context'],
): AcpModelEvent => ({
  type: 'xstate.done.actor.loadSession',
  actorId: 'loadSession',
  output: { ...data, kept: true },
});
