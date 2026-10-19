import type { SessionConfigOption } from '@repo/contracts';
import type { SavedChoices } from '#lib/product/session-configuration';
import {
  chosenOptions,
  type ConfigurationPicks,
} from './session-option-choices';

export interface SessionOptionsChoice {
  agent: string | undefined;
  projectId: string | undefined;
  saved: SavedChoices;
  picks: ConfigurationPicks;
  // True while New Session opens its Local Session.
  opening: boolean;
  // A New worktree opens no Session before Send, so the Server reads an uncached Agent's options (ADR-0023).
  inNewWorktree: boolean;
}

export interface SessionOptions {
  configOptions: SessionConfigOption[];
  // Only while this Device has no options for the Agent and Project and a Session or the Server reads them; then the cache shows at once.
  loading: boolean;
}

// The cached options with the reader's choices over them; nothing cached yet shows the Agent's defaults.
export const sessionOptions = (
  cached: SessionConfigOption[] | undefined,
  {
    saved,
    picks,
    opening,
  }: Omit<SessionOptionsChoice, 'agent' | 'projectId' | 'inNewWorktree'>,
): SessionOptions => ({
  configOptions: cached ? chosenOptions(cached, saved, picks) : [],
  loading: cached === undefined && opening,
});
