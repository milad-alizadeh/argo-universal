import { useSuggestionModels } from '#features/agents';
import { useFollowUpSuggestionsPreference } from '#features/settings';
import type { ComposerDetailViewProps } from './composer-detail-view';

// The Follow-up suggestions preference this Device keeps, and each Installed Agent's suggestion model, which the Server keeps.
export function useComposerSettings(): Omit<ComposerDetailViewProps, 'onBack'> {
  const preference = useFollowUpSuggestionsPreference();
  const models = useSuggestionModels();

  return {
    followUpSuggestions: preference.enabled,
    onFollowUpSuggestionsChange: preference.choose,
    suggestionModels: models.agents,
    onSuggestionModelChange: models.choose,
  };
}
