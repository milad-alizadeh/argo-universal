import { heldPrompt } from '@repo/mocks/agent/cancellable-scenarios';
import { streamedPrompt } from './feed-scenarios.mts';

// The prompt a soak Turn sends: the cancelling cycles' own is held by the scripted Agent until Stop.
export const soakPrompt = (cancel: boolean): string =>
  cancel ? heldPrompt : streamedPrompt;
