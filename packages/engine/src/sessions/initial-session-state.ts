import { createRejectionCounter } from '@repo/machine-log';
import { createAcpResponseReaders } from '../agents';
import { NativePermissions } from './native-permissions';
import type { SessionContext, SessionMachineInput } from './session-context';
import { noSubagents } from './subagents';

type TurnState = Pick<
  SessionContext,
  | 'activeTurnId'
  | 'activeTurnStartedAt'
  | 'usage'
  | 'permissionQueue'
  | 'nativePermissions'
  | 'hookedPermissions'
  | 'permissionDenied'
  | 'elicitationQueue'
>;

export const initialTurnState = (): TurnState => ({
  activeTurnId: null,
  activeTurnStartedAt: null,
  usage: null,
  permissionQueue: [],
  nativePermissions: new NativePermissions(),
  hookedPermissions: {},
  permissionDenied: false,
  elicitationQueue: [],
});

type AdmissionState = Pick<
  SessionContext,
  | 'archiveRequested'
  | 'configOptions'
  | 'slashCommands'
  | 'rejectedMessages'
  | 'failure'
  | 'openError'
  | 'stored'
  | 'sessionInsertCommitted'
  | 'creationReceipt'
>;

export const initialAdmissionState = (
  input: SessionMachineInput,
): AdmissionState => ({
  archiveRequested: input.archive ?? false,
  configOptions: [],
  slashCommands: null,
  rejectedMessages: 0,
  failure: null,
  openError: null,
  stored: input.kind === 'existing',
  sessionInsertCommitted: null,
  creationReceipt: null,
});

type AcpState = Pick<
  SessionContext,
  | 'acpLease'
  | 'pendingSubmission'
  | 'feedEnded'
  | 'subagents'
  | 'acpPrompt'
  | 'acpResponseReaders'
  | 'acpConfigurationRejections'
  | 'acpTurnOutcome'
  | 'turnEnding'
  | 'configQueue'
  | 'applyingConfig'
  | 'storageFailedTurn'
>;

type AcpReaders = Pick<
  AcpState,
  'acpResponseReaders' | 'acpConfigurationRejections'
>;

const acpReaders = (input: SessionMachineInput): AcpReaders => ({
  acpResponseReaders: createAcpResponseReaders(
    createRejectionCounter(`ACP Session ${input.sessionId}`),
  ),
  acpConfigurationRejections: createRejectionCounter(
    `ACP configuration ${input.sessionId}`,
  ),
});

export const initialAcpState = (input: SessionMachineInput): AcpState => ({
  acpLease: null,
  pendingSubmission: null,
  feedEnded: false,
  subagents: noSubagents,
  acpPrompt: null,
  ...acpReaders(input),
  acpTurnOutcome: null,
  turnEnding: { kind: 'completion' },
  configQueue: [],
  applyingConfig: null,
  storageFailedTurn: false,
});
