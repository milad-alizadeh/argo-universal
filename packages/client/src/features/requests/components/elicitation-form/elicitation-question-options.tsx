import type { ElicitationEnumOption } from '@repo/contracts';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { Checkbox } from '#primitives/inputs/checkbox';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';
import { choiceValue, selectedAnswers } from './elicitation-answers';
import { CustomAnswer } from './elicitation-custom-answer';

type ModelProps = { model: QuestionModel };

type FrameProps = ModelProps & { children: ReactNode };

type OptionProps = ModelProps & { option: ElicitationEnumOption };

export function ElicitationQuestionOptions({
  model,
}: ModelProps): ReactElement {
  return (
    <OptionsFrame model={model}>
      {model.question.options.map((option) => (
        <QuestionOption key={option.const} model={model} option={option} />
      ))}
      <CustomAnswer model={model} />
    </OptionsFrame>
  );
}

function OptionsFrame({ model, children }: FrameProps): ReactElement {
  const wide = useContentWide();

  return (
    <View
      role={model.question.multiple ? 'group' : 'radiogroup'}
      accessibilityLabel={model.question.title}
      className={optionsClassName(wide)}
    >
      {children}
    </View>
  );
}

function optionsClassName(wide: boolean): string {
  return cn(
    'rounded-xl android:rounded-[16px] p-1 gap-0.5 bg-muted',
    wide &&
      'bg-card web:shadow-[0_0_0_1px_#0000000a,0_1px_2px_#0000000a] dark:shadow-none dark:border dark:border-border',
  );
}

function QuestionOption({ model, option }: OptionProps): ReactElement {
  return (
    <Checkbox
      variant="option"
      selection={model.question.multiple ? 'multiple' : 'single'}
      label={option.title}
      value={selectedAnswers(model).includes(option.const)}
      disabled={model.inactive}
      onValueChange={(checked) =>
        model.change(choiceValue(model, option.const, checked))
      }
    />
  );
}
