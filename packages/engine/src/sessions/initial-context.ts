import { createRejectionCounter } from '@repo/machine-log';
import { createAcpResponseReaders } from '../agents';
import { AcpSessionLifetime } from './acp/acp-lifetime';
import { NativePermissions } from './native-permissions';
import {
  storageFailingEvent,
  type SessionContext,
  type SessionEvent,
  type SessionMachineInput,
} from './session-context';
import { createShells, readShellRecords } from './shells';
import { noSubagents } from './subagents';

// A Session before it enters: no Turn, no requests, no Subagents, and its stored Shells. The Shells report back through `send`: a change updates the list, a storage failure cancels the Turn.
export const initialSessionContext = (
  input: SessionMachineInput,
  send: (event: SessionEvent) => void,
): SessionContext => {
  const shellRuntime = createShells(input, {
    changed: (shell): void => send({ type: 'agent.shellChanged', shell }),
    failed: (error): void => {
      console.error('Shell storage failed', error);
      send({ type: storageFailingEvent });
    },
  });

  return {
    input,
    archiveRequested: input.archive ?? false,
    sessionId: input.sessionId,
    projectId: input.kind === 'new' ? input.projectId : '',
    agent: input.kind === 'new' ? input.agent : '',
    vendorSessionId: null,
    checkout: { path: '', branch: null },
    configValues: [],
    epoch: 0,
    maxRevision: 0,
    activityAt: 0,
    nextPosition: 0,
    kept: false,
    undisclosedInterruptedTurnId: null,
    activeTurnId: null,
    activeTurnStartedAt: null,
    usage: null,
    permissionQueue: [],
    nativePermissions: new NativePermissions(),
    hookedPermissions: {},
    permissionDenied: false,
    elicitationQueue: [],
    configOptions: [],
    slashCommands: null,
    rejectedMessages: 0,
    failure: null,
    openError: null,
    stored: input.kind === 'existing',
    sessionInsertCommitted: null,
    creationReceipt: null,
    acpLifetime: new AcpSessionLifetime(
      input.acp,
      input.createId,
      shellRuntime,
    ),
    shellRuntime,
    shells: readShellRecords(input.database, input.sessionId),
    acpLease: null,
    pendingSubmission: null,
    feedEnded: false,
    subagents: noSubagents,
    acpPrompt: null,
    acpResponseReaders: createAcpResponseReaders(
      createRejectionCounter(`ACP Session ${input.sessionId}`),
    ),
    acpConfigurationRejections: createRejectionCounter(
      `ACP configuration ${input.sessionId}`,
    ),
    acpTurnOutcome: null,
    turnEnding: { kind: 'completion' },
    configQueue: [],
    heldConfig: [],
    applyingConfig: null,
    storageFailedTurn: false,
  };
};
