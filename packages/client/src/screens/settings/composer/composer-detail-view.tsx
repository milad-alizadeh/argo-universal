import type {
  AgentSuggestionModel,
  SuggestionModelChoice,
} from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import {
  suggestionModelRows,
  suggestionModelsFooter,
} from './suggestion-model-rows';

export interface ComposerDetailViewProps {
  // Undefined until this Device has read the preference.
  followUpSuggestions?: boolean;
  onFollowUpSuggestionsChange?: (enabled: boolean) => void;
  // Each Installed Agent's model for Follow-up suggestions; undefined until the Server has answered.
  suggestionModels?: AgentSuggestionModel[];
  onSuggestionModelChange?: (id: string, choice: SuggestionModelChoice) => void;
  onBack?: () => void;
}

const followUpToggle = (props: ComposerDetailViewProps): React.JSX.Element => (
  <FieldGroup.Toggle
    title="Follow-up suggestions"
    value={props.followUpSuggestions === true}
    disabled={props.followUpSuggestions === undefined}
    onValueChange={(enabled) => props.onFollowUpSuggestionsChange?.(enabled)}
  />
);

// The Follow-up suggestions toggle, then the model each Installed Agent predicts with once the Server has listed them.
export function ComposerDetailView(
  props: ComposerDetailViewProps,
): React.JSX.Element {
  const agents = props.suggestionModels ?? [];
  const onChange = props.onSuggestionModelChange;
  const models = onChange && agents.length > 0 ? { agents, onChange } : null;

  return (
    <Screen title="Composer" onBack={props.onBack}>
      <FieldGroup>
        <FieldGroup.Section
          footer={models ? suggestionModelsFooter : undefined}
        >
          {followUpToggle(props)}
          {models && suggestionModelRows(models)}
        </FieldGroup.Section>
      </FieldGroup>
    </Screen>
  );
}
