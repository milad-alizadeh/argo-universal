import { ListSection } from '@repo/kit/primitives/lists/list';
import type { ReactElement } from 'react';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';
import { choiceValue, selectedAnswers } from './elicitation-answers';
import { CustomAnswer } from './elicitation-custom-answer';
import { ElicitationList } from './elicitation-list';
import { OptionRows } from './elicitation-option-rows';
import { TextFields } from './elicitation-text-fields';

type ModelProps = { model: QuestionModel };

// The options in one card, and the custom answer as a field under it.
export function QuestionRows({ model }: ModelProps): ReactElement {
  return (
    <ElicitationList key={model.question.name}>
      <ListSection>
        <QuestionOptions model={model} />
      </ListSection>
      <TextFields>
        <CustomAnswer model={model} />
      </TextFields>
    </ElicitationList>
  );
}

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
