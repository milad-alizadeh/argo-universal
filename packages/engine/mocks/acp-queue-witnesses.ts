import { QueuedPromptId } from '@repo/contracts';
import type { Sent } from '@repo/vitest/model-audit';
import { assertEvent, getNextSnapshot } from 'xstate';
import { sessionMachine } from '../src/sessions';
import { modelShellChanged } from './acp-model-start-events';
import type { AcpModelEvent, AcpModelSnapshot } from './acp-session-model';

const row = {
  id: QueuedPromptId.parse('model-queued-prompt'),
  revision: 0,
  prompt: [{ type: 'text' as const, text: 'Queued model Prompt' }],
};

function queuedContext(initial: AcpModelSnapshot): AcpModelSnapshot['context'] {
  return {
    ...initial.context,
    configQueue: [],
    heldConfig: [],
    pendingSubmission: null,
    dispatchingQueueId: null,
    promptQueue: { items: [row], pauseReason: null },
  };
}

function queuedIdle(initial: AcpModelSnapshot): AcpModelSnapshot {
  const state = sessionMachine.resolveState({
    value: { open: { acp: 'idle' } },
    context: queuedContext(initial),
  });

  Object.assign(state.children, initial.children);

  return state;
}

export function queueAutomaticWalk(initial: AcpModelSnapshot): Sent {
  const state = queuedIdle(initial);

  return { state, event: modelShellChanged(state) };
}

function preparing(initial: AcpModelSnapshot): AcpModelSnapshot {
  const state = queuedIdle(initial);
  const event = modelShellChanged(state);
  assertEvent(event, 'agent.shellChanged');

  return getNextSnapshot(sessionMachine, state, event);
}

function completed(
  output: AcpModelSnapshot['context']['pendingSubmission'],
): AcpModelEvent {
  return {
    type: 'xstate.done.actor.prepareQueuedPrompt',
    actorId: 'prepareQueuedPrompt',
    output,
  };
}

const refused: AcpModelEvent = {
  type: 'xstate.error.actor.prepareQueuedPrompt',
  actorId: 'prepareQueuedPrompt',
  error: new Error('Preparation refused'),
};

function preparedEvents(state: AcpModelSnapshot): Sent[] {
  return [
    completed(null),
    completed(state.context.pendingSubmission),
    refused,
    { type: 'session.cancel' },
    { type: 'session.close' },
  ].map((event) => ({ state, event }));
}

function appendEvent(): AcpModelEvent {
  return {
    type: 'session.queue',
    command: { action: 'append', prompt: row.prompt },
    committed: Promise.withResolvers<void>(),
  };
}

const disconnected: AcpModelEvent = {
  type: 'session.queueEditDisconnected',
  id: row.id,
  token: 'disconnected-edit',
};

export function queueTransitionWitnesses(initial: AcpModelSnapshot): Sent[] {
  const state = preparing(initial);

  return [
    ...preparedEvents(state),
    { state, event: appendEvent() },
    { state, event: disconnected },
  ];
}
