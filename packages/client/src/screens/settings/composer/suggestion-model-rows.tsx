import type {
  AgentSuggestionModel,
  SuggestionModelChoice,
} from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';

const sessionModelLabel = 'Same as Session';

export const suggestionModelsFooter =
  'The model each Agent uses to predict your next Prompt. A smaller one is faster and costs less.';

const sessionKey = 'session';

const modelKey = (value: string): string => `model:${value}`;

const keyOf = (choice: SuggestionModelChoice): string =>
  choice.type === 'session' ? sessionKey : modelKey(choice.value);

type PickerOption = { value: string; label: string };

// "Same as Session" first, then the models the Agent offered; a chosen model it has not offered yet keeps its value as its name.
function pickerOptions(agent: AgentSuggestionModel): PickerOption[] {
  const offered = agent.models.map(({ value, name }) => ({
    value: modelKey(value),
    label: name,
  }));

  const { choice } = agent;

  const unlisted =
    choice.type === 'model' &&
    !agent.models.some(({ value }) => value === choice.value);

  return [
    { value: sessionKey, label: sessionModelLabel },
    ...offered,
    ...(unlisted ? [{ value: keyOf(choice), label: choice.value }] : []),
  ];
}

const choiceOf = (key: string): SuggestionModelChoice =>
  key === sessionKey
    ? { type: 'session' }
    : { type: 'model', value: key.slice(modelKey('').length) };

export type SuggestionModelRowsProps = {
  agents: AgentSuggestionModel[];
  onChange: (id: string, choice: SuggestionModelChoice) => void;
};

// A row per Installed Agent under the Follow-up suggestions toggle, choosing the model it predicts with.
export const suggestionModelRows = ({
  agents,
  onChange,
}: SuggestionModelRowsProps): ReactElement[] =>
  agents.map((agent) => (
    <FieldGroup.Picker
      key={agent.id}
      title={agent.name}
      presentation="menu"
      value={keyOf(agent.choice)}
      options={pickerOptions(agent)}
      onValueChange={(key) => onChange(agent.id, choiceOf(key))}
    />
  ));
