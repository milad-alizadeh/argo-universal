import { List, ListSection } from '@repo/kit/primitives/lists/list';
import type { ReactElement } from 'react';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';
import { choiceValue, selectedAnswers } from './elicitation-answers';
import { CustomAnswer } from './elicitation-custom-answer';
import { OptionRows } from './elicitation-option-rows';

type ModelProps = { model: QuestionModel };

// The options in one card, and the custom answer as a FieldGroup row under it.
export function QuestionRows({ model }: ModelProps): ReactElement {
  return (
    <>
      <OptionCards model={model} />
      <CustomAnswer key={model.question.name} model={model} />
    </>
  );
}

const OptionCards = ({ model }: ModelProps): ReactElement => (
  <List
    key={model.question.name}
    appearance="cards"
    padding={4}
    paddingTop={0}
    paddingBottom={0}
    keyboardShouldPersistTaps="handled"
  >
    <ListSection>
      <QuestionOptions model={model} />
    </ListSection>
  </List>
);

function QuestionOptions({ model }: ModelProps): ReactElement {
  return (
    <OptionRows
      options={model.question.options}
      selected={selectedAnswers(model)}
      multiple={model.question.multiple}
      disabled={model.inactive}
      onToggle={(choice, checked) =>
        model.change(choiceValue(model, choice, checked))
      }
    />
  );
}
