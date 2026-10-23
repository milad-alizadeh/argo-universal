import { Text } from '@repo/kit/primitives/content/text';
import { Surface } from '@repo/kit/primitives/layout/surface';
import { List, ListSection } from '@repo/kit/primitives/lists/list';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';
import { choiceValue, selectedAnswers } from './elicitation-answers';
import { chooseLabel } from './elicitation-choose-label';
import { CustomAnswer } from './elicitation-custom-answer';
import { OptionRows } from './elicitation-option-rows';

type ModelProps = { model: QuestionModel };

// The options in one card under their hint, and the custom answer as a FieldGroup row below it.
export function QuestionRows({ model }: ModelProps): ReactElement {
  return (
    <>
      <OptionGroup model={model} />
      <CustomAnswer key={model.question.name} model={model} />
    </>
  );
}

// The hint heads the card as a List section's header does, set in from the rows.
const OptionGroup = ({ model }: ModelProps): ReactElement => (
  <View className="gap-2 px-4 wide:px-0">
    <OptionHint model={model} />
    <Surface kind="card">
      <OptionCard model={model} />
    </Surface>
  </View>
);

const OptionHint = ({ model }: ModelProps): ReactElement => (
  <View className="px-4">
    <Text
      role="heading"
      tone="muted"
      accessibilityRole="heading"
      aria-level={2}
    >
      {chooseLabel(model.question)}
    </Text>
  </View>
);

const OptionCard = ({ model }: ModelProps): ReactElement => (
  <List
    key={model.question.name}
    appearance="plain"
    fit
    padding={0}
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
