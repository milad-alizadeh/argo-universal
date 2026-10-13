import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import {
  useElicitationQuestions,
  type QuestionModel,
} from '../../hooks/use-elicitation-questions';
import { RequestCard } from '../request-card/request-card';
import type { ElicitationFormProps } from './elicitation-form-props';
import { QuestionActions } from './elicitation-question-actions';
import { QuestionHeader } from './elicitation-question-header';
import { ElicitationQuestionOptions } from './elicitation-question-options';
import type { ElicitationQuestion } from './elicitation-questions';

type ModelProps = { model: QuestionModel };

export function ElicitationQuestionForm(
  props: ElicitationFormProps & {
    questions: ElicitationQuestion[];
  },
): ReactElement {
  const model = useElicitationQuestions(props, props.questions);

  return <ElicitationQuestionBody model={model} />;
}

export function ElicitationQuestionBody({ model }: ModelProps): ReactElement {
  const wide = useContentWide();

  return (
    <RequestCard {...cardProps(model, wide)}>
      <View
        className={cn('px-4 pt-1 ios:pt-9 gap-4', wide && 'px-3 pt-3 gap-3')}
      >
        <QuestionHeader model={model} />
        <ElicitationQuestionOptions key={model.question.name} model={model} />
      </View>
    </RequestCard>
  );
}

function cardProps(
  model: QuestionModel,
  wide: boolean,
): Omit<ComponentProps<typeof RequestCard>, 'children'> {
  return {
    appearance: 'embedded',
    state: model.props.state,
    error: model.props.error,
    onEnter: model.advance,
    onEscape: (): void => model.props.onAnswer({ action: 'cancel' }),
    footerClassName: footerClassName(wide),
    actions: <QuestionActions model={model} />,
  };
}

function footerClassName(wide: boolean): string {
  return cn(
    'min-h-0 px-4 pt-4 pb-0 gap-2 flex-col items-stretch',
    wide && 'px-3 pt-3 pb-3.5 flex-row justify-end gap-1',
  );
}
