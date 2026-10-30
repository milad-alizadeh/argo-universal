import { pathStates, type Sent } from '@repo/vitest/model-audit';
import { getNextSnapshot, type EventFromLogic } from 'xstate';
import { sessionMachine } from '../src/sessions';
import type {
  AcpModelSnapshot,
  createAcpSessionModel,
} from './acp-session-model';

type SessionEvent = EventFromLogic<typeof sessionMachine>;

type Paths = ReturnType<typeof createAcpSessionModel>['paths'];

function stateFor(
  states: AcpModelSnapshot[],
  matches: (state: AcpModelSnapshot) => boolean,
): AcpModelSnapshot {
  const state = states.find(matches);

  if (!state) throw new Error('The model did not reach the required state');

  return state;
}

function nativePermission(state: AcpModelSnapshot): SessionEvent {
  return {
    type: 'session.permissionRequested',
    turnId: state.context.activeTurnId ?? 'ended-turn',
    request: {
      requestId: 'native-model-request',
      toolCallId: 'model-tool',
      title: 'Model operation',
      operation: { id: 'session.archive', description: 'Archive', input: '{}' },
      options: [{ optionId: 'allow', name: 'Allow', kind: 'allow_once' }],
    },
  };
}

const hooked: SessionEvent = {
  type: 'session.permissionHooked',
  requestId: 'model-request',
  answer: { optionId: 'model-allow' },
};

const commands: SessionEvent = {
  type: 'acp.update',
  notification: {
    sessionId: 'model',
    update: {
      sessionUpdate: 'available_commands_update',
      availableCommands: [],
    },
  },
};

const title: SessionEvent = {
  type: 'acp.update',
  notification: {
    sessionId: 'model',
    update: { sessionUpdate: 'session_info_update', title: 'Model title' },
  },
};

function creationReceipt(state: AcpModelSnapshot): SessionEvent {
  return {
    type: 'session.creationSettled',
    receipt: {
      status: 'accepted',
      start: { sessionId: state.context.sessionId },
    },
  };
}

function creationWitnesses(states: AcpModelSnapshot[]): Sent[] {
  const state = stateFor(
    states,
    (item) => item.matches('creating') && item.context.input.kind === 'new',
  );

  return [
    { state, event: creationReceipt(state) },
    { state, event: hooked },
  ];
}

function openingWitnesses(states: AcpModelSnapshot[]): Sent[] {
  const state = stateFor(states, (item) =>
    item.matches({ open: { acp: 'opening' } }),
  );

  return [
    { state, event: commands },
    { state, event: title },
  ];
}

const answerNative: SessionEvent = {
  type: 'session.answerPermission',
  requestId: 'native-model-request',
  optionId: 'allow',
};

function isWorking(state: AcpModelSnapshot): boolean {
  return (
    state.matches({ open: { acp: { activeTurn: 'working' } } }) &&
    state.context.activeTurnId !== null &&
    state.context.permissionQueue.length === 0
  );
}

function permissionWitnesses(states: AcpModelSnapshot[]): Sent[] {
  const state = stateFor(states, isWorking);

  const permission = nativePermission(state);

  const requested = getNextSnapshot(sessionMachine, state, permission);

  return [
    { state, event: hooked },
    { state, event: permission },
    { state: requested, event: answerNative },
  ];
}

function cancellationWitnesses(states: AcpModelSnapshot[]): Sent[] {
  const state = stateFor(states, (item) =>
    item.matches({ open: { acp: { activeTurn: 'cancelling' } } }),
  );

  return [
    { state, event: nativePermission(state) },
    { state, event: { type: 'session.cancel' } },
    { state, event: commands },
    { state, event: title },
  ];
}

function closingStates(states: AcpModelSnapshot[]): AcpModelSnapshot[] {
  return [
    stateFor(states, (item) => item.matches({ open: { acp: 'closing' } })),
    stateFor(states, (item) => item.matches({ open: { acp: 'archiving' } })),
    stateFor(states, (item) => item.matches({ open: { acp: 'flushing' } })),
    stateFor(states, (item) => item.matches('archived')),
  ];
}

function closeWitnesses(states: AcpModelSnapshot[]): Sent[] {
  return closingStates(states).map((state) => ({
    state,
    event: { type: 'session.close' },
  }));
}

export function extraTransitionWitnesses(paths: Paths): Sent[] {
  const states = pathStates(paths);

  return [
    ...creationWitnesses(states),
    ...openingWitnesses(states),
    ...permissionWitnesses(states),
    ...cancellationWitnesses(states),
    ...closeWitnesses(states),
  ];
}
