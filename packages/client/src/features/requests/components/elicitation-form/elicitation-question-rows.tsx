import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';
import { choiceValue, selectedAnswers } from './elicitation-answers';
import { CustomAnswer } from './elicitation-custom-answer';
import { ElicitationList } from './elicitation-list';
import { OptionRows } from './elicitation-option-rows';

// Android sets the custom answer as a bare Material field under the options, never in their card.
const customInCard = Platform.OS !== 'android';

type ModelProps = { model: QuestionModel };

export function QuestionRows({ model }: ModelProps): ReactElement {
  return (
    <ElicitationList key={model.question.name}>
      <GroupedListSection>
        <QuestionOptions model={model} />
        {customInCard && <CustomAnswer model={model} />}
      </GroupedListSection>
      {!customInCard && (
        <GroupedListSection textFields>
          <CustomAnswer model={model} />
        </GroupedListSection>
      )}
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
