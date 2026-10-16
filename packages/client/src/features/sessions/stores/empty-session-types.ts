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

export const idleAttempt: OpenAttempt = { status: 'idle' };

// Opening again keeps the failure on show until the open settles.
export const openingAgain = (attempt: OpenAttempt): OpenAttempt =>
  attempt.status === 'idle'
    ? attempt
    : { status: 'retrying', error: attempt.error };

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
  // Retry or a second Send opens again; the failure stays until it settles.
  attempt: OpenAttempt;
  pendingPrompt: boolean;
  // The Session the page reads options and the first prompt from, until it hands it on.
  openSessionId: string | undefined;
  // True while the Local Session opens, reopens or takes the reader's choices.
  opening: boolean;
  handedOff: boolean;
}

const stateFields = [
  'attempt',
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
