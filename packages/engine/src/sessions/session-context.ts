import type {
  ContextUsage,
  PendingElicitation,
  PendingPermission,
  SessionConfigOption,
  SlashCommand,
  SessionOpenError,
  ShellRecord,
} from '@repo/contracts';
import type { CoreHooks } from '@repo/contracts/plugins';
import type { createRejectionCounter } from '@repo/machine-log';
import type { AcpSessionLease, createAcpResponseReaders } from '../agents';
import type { FeedTurnEnding } from '../feed';
import type { WriterActorRef, WriterEvent } from '../storage';
import type {
  AcpLifetimeEvent,
  AcpSessionDependencies,
  AcpSessionLifetime,
} from './acp/acp-lifetime';
import type { AcpTurnOutcome } from './acp/prompts/prompt-outcome';
import type { AcpPromptRequest as PromptRequest } from './acp/prompts/prompt-types';
import type { LocalSubmission } from './acp/prompts/submission';
import type { ElicitationAnswerContent } from './acp/requests/elicitation-types';
import type {
  SessionCreationReceipt,
  SessionCreationSettled,
} from './creation-receipt';
import type {
  NativePermissionEvent,
  NativePermissions,
} from './native-permissions';
import type { PermissionHooked } from './permission-hooks';
import type { SessionData, SessionInput } from './session-data';
import type { Shells } from './shells';
import type { Subagents } from './subagents';

export const setConfigEvent = 'session.setConfigOption';

export const storageFailingEvent = 'session.storageFailing';

export const acpUpdateEvent = 'acp.update';

export const writeFeedEvent = 'writer.write';

export type EndTurnParameters = AcpTurnOutcome;

export type FailureParameters = { error: unknown };

// What a Session asks the database writer to store, and the commit it may wait on.
export type SessionWrite = Pick<
  Extract<WriterEvent, { type: typeof writeFeedEvent }>,
  'job' | 'committed'
>;

export type SessionMachineInput = SessionInput & {
  now: () => number;
  createId: () => string;
  acp: AcpSessionDependencies;
  // The Engine's database writer, resolved once when the Session is opened.
  writer: WriterActorRef;
  archive?: boolean;
  // Plugin Hooks on Permission requests and settled Turns (ADR-0027).
  hooks: CoreHooks;
};

export type SessionCommand =
  | ({ type: 'session.prompt' } & LocalSubmission)
  | {
      type: 'session.answerPermission';
      requestId: PendingPermission['requestId'];
      optionId: PendingPermission['options'][number]['optionId'] | null;
    }
  | {
      type: 'session.answerElicitation';
      requestId: PendingElicitation['requestId'];
      action: 'accept' | 'decline' | 'cancel';
      content?: ElicitationAnswerContent;
    }
  | {
      type: typeof setConfigEvent;
      configId: string;
      value: string | boolean;
      applied?: PromiseWithResolvers<SessionConfigOption[]>;
      held?: boolean;
    }
  | { type: 'session.archive' }
  | { type: 'session.unarchive' }
  | { type: 'session.cancel' }
  | { type: 'session.close' };

export type SessionEvent =
  | SessionCommand
  | AcpLifetimeEvent
  | { type: typeof storageFailingEvent }
  | { type: 'session.shutdown' }
  | { type: 'agent.shellChanged'; shell: ShellRecord }
  | PermissionHooked
  | NativePermissionEvent
  | SessionCreationSettled;

export interface SessionContext extends SessionData {
  input: SessionMachineInput;
  archiveRequested: boolean;
  activeTurnId: string | null;
  // When the running Turn started, in epoch milliseconds.
  activeTurnStartedAt: number | null;
  usage: ContextUsage | null;
  permissionQueue: PendingPermission[];
  nativePermissions: NativePermissions;
  // The option a `tool.check` Hook chose for a queued request, by request id; it answers once the request is first in the queue.
  hookedPermissions: Record<string, string | null>;
  // The user (or a Hook) denied a Permission request during the running Turn.
  permissionDenied: boolean;
  elicitationQueue: PendingElicitation[];
  configOptions: SessionConfigOption[];
  slashCommands: SlashCommand[] | null;
  rejectedMessages: number;
  failure: string | null;
  openError: SessionOpenError | null;
  // False for a new Session until its Agent is ready and its row is written.
  stored: boolean;
  sessionInsertCommitted: Promise<'committed' | 'retrying' | 'failed'> | null;
  creationReceipt: SessionCreationReceipt | null;
  acpLifetime: AcpSessionLifetime;
  acpLease: AcpSessionLease | null;
  pendingSubmission: LocalSubmission | null;
  acpPrompt: PromptRequest | null;
  acpResponseReaders: ReturnType<typeof createAcpResponseReaders>;
  acpConfigurationRejections: ReturnType<typeof createRejectionCounter>;
  acpTurnOutcome: EndTurnParameters | null;
  turnEnding: FeedTurnEnding;
  configQueue: Extract<SessionCommand, { type: typeof setConfigEvent }>[];
  applyingConfig: Extract<
    SessionCommand,
    { type: typeof setConfigEvent }
  > | null;
  feedEnded: boolean;
  subagents: Subagents;
  shells: ShellRecord[];
  shellRuntime: Shells;
  // The database writer refused this Turn's Feed rows, so the Turn is cancelled and ends with a storage error.
  storageFailedTurn: boolean;
}
