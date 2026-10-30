import { AcpSessionLifetime } from './acp/acp-lifetime';
import { initialSessionData } from './initial-session-data';
import {
  initialAcpState,
  initialAdmissionState,
  initialTurnState,
} from './initial-session-state';
import {
  storageFailingEvent,
  type SessionContext,
  type SessionEvent,
  type SessionMachineInput,
} from './session-context';
import { createShells, readShellRecords } from './shells';

const shellCallbacks = (
  send: (event: SessionEvent) => void,
): Parameters<typeof createShells>[1] => ({
  changed: (shell): void => send({ type: 'agent.shellChanged', shell }),
  failed: (error): void => {
    console.error('Shell storage failed', error);
    send({ type: storageFailingEvent });
  },
});

type ShellState = Pick<
  SessionContext,
  'acpLifetime' | 'shellRuntime' | 'shells'
>;

const initialShellState = (
  input: SessionMachineInput,
  shellRuntime: ReturnType<typeof createShells>,
): ShellState => ({
  acpLifetime: new AcpSessionLifetime(input.acp, input.createId, shellRuntime),
  shellRuntime,
  shells: readShellRecords(input.database, input.sessionId),
});

// The initial Session has no Turn or requests; its stored Shells report changes and storage failures.
export const initialSessionContext = (
  input: SessionMachineInput,
  send: (event: SessionEvent) => void,
): SessionContext => {
  const shellRuntime = createShells(input, shellCallbacks(send));

  return {
    input,
    ...initialSessionData(input),
    ...initialTurnState(),
    ...initialAdmissionState(input),
    ...initialShellState(input, shellRuntime),
    ...initialAcpState(input),
  };
};
