import type {
  SessionCloseOutput,
  SessionConfigOption,
  SessionNewInput,
  SessionPromptOutput,
} from '@repo/contracts';
import type { ConfigurationChange, SavedChoices } from '#features/composer';

export type FirstPrompt = SessionNewInput['prompt'];

// What the machine asks of the Server and the screen.
export interface EmptySessionPorts {
  // The signal aborts when the screen is left while the Session opens.
  open: (
    input: SessionNewInput,
    signal: AbortSignal,
  ) => Promise<{ sessionId: string }>;
  close: (sessionId: string) => Promise<SessionCloseOutput>;
  setConfigOption: (
    sessionId: string,
    change: ConfigurationChange,
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
  // The opened Session's Feed holds the first prompt, so the Session page can show it from its first frame.
  | { type: 'feed.showsPrompt' }
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
  promptShown: boolean;
  error: string | undefined;
}
