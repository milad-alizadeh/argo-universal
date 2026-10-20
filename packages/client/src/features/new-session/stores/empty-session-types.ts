import type {
  InitialConfigOption,
  SessionNewInput,
  SessionNewOutput,
} from '@repo/contracts';
import type { ConnectionState } from '#features/connection';
import type { NewSessionOutcome } from '../types/new-session-attempt';

export type FirstPrompt = SessionNewInput['prompt'];

// What New Session asks of the Server and the screen.
export interface EmptySessionPorts {
  open: (input: SessionNewInput) => Promise<SessionNewOutput>;
  // The screen becomes that Session's page in place: no new page, no animation.
  handOff: (sessionId: string) => void;
  // Composer clears the kept Project draft before the Session page takes over.
  clearDraft: () => void;
  // The Connection's state as it is now, which tells a dropped open from a failed one.
  connectionState: () => ConnectionState;
}

// A Feed that never shows the prompt hands the Session on after this long anyway.
export const promptShowTimeoutMs = 3_000;

export interface EmptySessionState extends NewSessionOutcome {
  pendingPrompt: boolean;
  // The Session the page reads options and the first prompt from, until it hands it on.
  openSessionId: string | undefined;
  // True while Send creates the Session.
  opening: boolean;
  handedOff: boolean;
}

const stateFields = [
  'attempt',
  'connectionError',
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
  // The unsent choices applied before the first prompt, for either checkout.
  initial: InitialConfigOption[];
}
