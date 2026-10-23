import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';
import { customAnswer, customValue } from './elicitation-answers';
import { chooseLabel } from './elicitation-choose-label';
import { questionChoices } from './elicitation-question-choices';

type ModelProps = { model: QuestionModel };

/*
 * One FieldGroup section headed by the hint: the options as inline Picker rows, and the custom answer as the
 * section's last row. Typing an answer chooses it, beside any options already chosen.
 */
export function QuestionRows({ model }: ModelProps): ReactElement {
  return (
    <FieldGroup key={model.question.name} disabled={model.inactive}>
      <FieldGroup.Section title={chooseLabel(model.question)}>
        {questionChoices({ model })}
        <CustomField model={model} />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

const CustomField = ({ model }: ModelProps): ReactElement => (
  <FieldGroup.TextField
    title="Custom answer"
    hideTitle
    placeholder="Something else…"
    value={customAnswer(model)}
    onChangeText={(text) => model.change(customValue(model, text))}
  />
);
