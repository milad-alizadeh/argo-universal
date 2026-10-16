import type { ReactElement } from 'react';
import { TextInput } from '#primitives/inputs/text-input';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';
import { customAnswer, customValue } from './elicitation-answers';

// A field, not an option row: typing an answer chooses it, beside any options already chosen.
type ModelProps = { model: QuestionModel };

export function CustomAnswer({ model }: ModelProps): ReactElement {
  return (
    <TextInput
      variant="row"
      labelHidden
      label="Custom answer"
      placeholder="Something else…"
      value={customAnswer(model)}
      disabled={model.inactive}
      onChangeText={(text) => model.change(customValue(model, text))}
    />
  );
}
