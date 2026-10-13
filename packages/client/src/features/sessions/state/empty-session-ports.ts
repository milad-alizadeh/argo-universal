import type { SessionConfigOption, SessionNewInput } from '@repo/contracts';
import type { ConfigurationChange, SavedChoices } from '#features/composer';

export type FirstPrompt = SessionNewInput['prompt'];

// What the machine asks of the Server and the screen.
export interface EmptySessionPorts {
  // The signal aborts when the screen is left while the Session opens.
  open: (
    input: SessionNewInput,
    signal: AbortSignal,
  ) => Promise<{ sessionId: string }>;
  close: (sessionId: string) => Promise<unknown>;
  setConfigOption: (
    sessionId: string,
    change: ConfigurationChange,
  ) => Promise<SessionConfigOption[]>;
  prompt: (sessionId: string, prompt: FirstPrompt) => Promise<unknown>;
  handOff: (sessionId: string) => void;
  // The next remembered choice the options don't hold yet, skipping those already applied.
  nextChange: (
    options: SessionConfigOption[],
    saved: SavedChoices,
    applied: readonly string[],
  ) => ConfigurationChange | undefined;
}

export type EmptySessionEvent =
  // The Session the choices describe, undefined until every choice has settled.
  | {
      type: 'choices.changed';
      input: SessionNewInput | undefined;
      connected: boolean;
    }
  // The opened Session's options as its Feed reads them, with this device's saved choices for its Agent.
  | {
      type: 'options.loaded';
      configOptions: SessionConfigOption[];
      saved: SavedChoices;
    }
  | { type: 'send'; prompt: FirstPrompt }
  | { type: 'retry' };

export interface EmptySessionContext {
  ports: EmptySessionPorts;
  input: SessionNewInput | undefined;
  connected: boolean;
  // The choices of the Session last opened, compared by value.
  openedKey: string | undefined;
  sessionId: string | undefined;
  configOptions: SessionConfigOption[];
  saved: SavedChoices;
  // Each remembered choice is applied at most once.
  applied: string[];
  pendingPrompt: FirstPrompt | undefined;
  error: string | undefined;
}
