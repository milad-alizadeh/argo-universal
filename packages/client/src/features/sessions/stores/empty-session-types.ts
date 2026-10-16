import type {
  InitialConfigOption,
  SessionCloseOutput,
  SessionConfigOption,
  SessionNewInput,
  SessionNewOutput,
  SessionPromptOutput,
} from '@repo/contracts';
import type { SavedChoices } from '#lib/product/session-configuration';
import type { ConfigurationPicks } from '../state/session-option-choices';
import type { OpenAttempt } from '../types/open-attempt';
import { decodeOpenFailure } from '../utils/open-failure';

// How the open went: the Agent's failure, for the callout, or a failure short of the Agent, for a toast.
export type OpenOutcome = Pick<EmptySessionState, 'attempt' | 'unreached'>;

export const settledOpen: OpenOutcome = {
  attempt: { status: 'idle' },
  unreached: undefined,
};

// Opening again keeps the Agent's failure on show until the open settles; a toast's failure is done with.
export const openingAgain = ({ attempt }: OpenOutcome): OpenOutcome => ({
  attempt:
    attempt.status === 'idle'
      ? attempt
      : { status: 'retrying', error: attempt.error },
  unreached: undefined,
});

// The Agent's refusal fails the attempt; any other failure, such as a dropped Connection, leaves it idle for a toast.
export const failedOpen = (cause: unknown): OpenOutcome => {
  const error = decodeOpenFailure(cause);

  return error
    ? { attempt: { status: 'failed', error }, unreached: undefined }
    : { attempt: settledOpen.attempt, unreached: cause };
};

export type FirstPrompt = SessionNewInput['prompt'];

// What New Session asks of the Server and the screen.
export interface EmptySessionPorts {
  open: (input: SessionNewInput) => Promise<SessionNewOutput>;
  close: (sessionId: string) => Promise<SessionCloseOutput>;
  setConfigOption: (
    sessionId: string,
    change: InitialConfigOption,
  ) => Promise<SessionConfigOption[]>;
  prompt: (
    sessionId: string,
    prompt: FirstPrompt,
  ) => Promise<SessionPromptOutput>;
  // The screen becomes that Session's page in place: no new page, no animation.
  handOff: (sessionId: string) => void;
  // Composer clears the kept Project draft before the Session page takes over.
  clearDraft: () => void;
}

// An Agent change settles for this long before the Empty Session reopens for it.
export const choiceDebounceMs = 300;

// A Feed that never shows the prompt hands the Session on after this long anyway.
export const promptShowTimeoutMs = 3_000;

export interface EmptySessionState {
  // The Agent's sign-in or launch failure, which the callout answers. Retry or a second Send opens again; the failure stays until it settles.
  attempt: OpenAttempt;
  // A failure short of the Agent, such as a dropped Connection: a toast says why, and the Connection reopening opens again.
  unreached: unknown;
  pendingPrompt: boolean;
  // The Session the page reads options and the first prompt from, until it hands it on.
  openSessionId: string | undefined;
  // True while the Local Session opens, reopens or takes the reader's choices.
  opening: boolean;
  handedOff: boolean;
}

const stateFields = [
  'attempt',
  'unreached',
  'pendingPrompt',
  'openSessionId',
  'opening',
  'handedOff',
] as const satisfies readonly (keyof EmptySessionState)[];

export const sameEmptySessionState = (
  a: EmptySessionState,
  b: EmptySessionState,
): boolean => stateFields.every((field) => a[field] === b[field]);

export interface EmptySessionChoices {
  // The Session the choices describe, undefined until every choice has settled.
  input: SessionNewInput | undefined;
  connected: boolean;
}

export interface EmptySessionConfiguration {
  saved: SavedChoices;
  picks: ConfigurationPicks;
  // The cached options with the reader's choices, which a New worktree Session opens with.
  initial: InitialConfigOption[];
}

// The open Session's options as its Feed reads them.
export interface LiveOptions {
  sessionId: string;
  configOptions: SessionConfigOption[];
}

export const noop = (): void => {};
