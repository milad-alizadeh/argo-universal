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
  // True only when the Server reports discovery with no saved options.
  opening: boolean;
  // Checkout choice does not change how options are read.
  inNewWorktree: boolean;
}

export interface SessionOptions {
  configOptions: SessionConfigOption[];
  // Saved Server options remain visible during refresh.
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
