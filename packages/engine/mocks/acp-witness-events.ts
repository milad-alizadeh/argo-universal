import type { Sent } from '@repo/vitest/model-audit';
import { getNextSnapshot, type EventFromLogic } from 'xstate';
import { sessionMachine } from '../src/sessions';
import { appendEvent } from './acp-queue-witnesses';
import type { AcpModelSnapshot } from './acp-session-model';

type SessionEvent = EventFromLogic<typeof sessionMachine>;

// The Agent's commands and title change while it opens or settles a cancel.
export const commands: SessionEvent = {
  type: 'acp.update',
  notification: {
    sessionId: 'model',
    update: {
      sessionUpdate: 'available_commands_update',
      availableCommands: [],
    },
  },
};

export const title: SessionEvent = {
  type: 'acp.update',
  notification: {
    sessionId: 'model',
    update: { sessionUpdate: 'session_info_update', title: 'Model title' },
  },
};

const elicitation: SessionEvent = {
  type: 'acp.elicitationRequested',
  request: {
    requestId: 'model-elicitation',
    mode: 'form',
    message: 'Model question',
    requestedSchema: { properties: {} },
  },
};

// A Prompt appended while a working Turn waits on an Elicitation settles it (#2507).
export function elicitationWitness(working: AcpModelSnapshot): Sent {
  const waiting = getNextSnapshot(sessionMachine, working, elicitation);

  return { state: waiting, event: appendEvent() };
}
