import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import {
  useElicitationForm,
  type ElicitationModel,
} from '../../hooks/use-elicitation-form';
import { RequestCard } from '../request-card/request-card';
import { ElicitationActions } from './elicitation-actions';
import {
  ElicitationFields,
  ElicitationHeading,
  ElicitationValidation,
} from './elicitation-form-body';
import type { ElicitationFormProps } from './elicitation-form-props';
import { ElicitationQuestionForm } from './elicitation-question-form';
import { elicitationQuestions } from './elicitation-questions';

export type { ElicitationValues } from './elicitation-schema';
export type {
  ElicitationAnswer,
  ElicitationFormProps,
} from './elicitation-form-props';

export function ElicitationForm(props: ElicitationFormProps): ReactElement {
  return <RequestForm key={props.request.requestId} {...props} />;
}

function RequestForm(props: ElicitationFormProps): ReactElement {
  const questions = elicitationQuestions(props.request);
  return questions ? (
    <ElicitationQuestionForm {...props} questions={questions} />
  ) : (
    <FieldForm {...props} />
  );
}

function FieldForm(props: ElicitationFormProps): ReactElement {
  const model = useElicitationForm(props);
  return <ElicitationFieldForm model={model} />;
}

export function ElicitationFieldForm({
  model,
}: {
  model: ElicitationModel;
}): ReactElement {
  return (
    <RequestCard {...cardProps(model)}>
      <FormBody model={model} />
    </RequestCard>
  );
}

function cardProps(
  model: ElicitationModel,
): Omit<ComponentProps<typeof RequestCard>, 'children'> {
  return {
    appearance: 'embedded',
    state: model.state,
    error: model.error,
    onEnter: (): void => model.answer('accept'),
    onEscape: (): void => model.answer('cancel'),
    footerClassName: 'flex-col items-stretch gap-2 px-4 pb-4',
    actions: <ElicitationActions model={model} />,
  };
}

function FormBody({ model }: { model: ElicitationModel }): ReactElement {
  return (
    <>
      <FormContent model={model} />
      <ElicitationValidation
        answered={model.state.kind === 'answered'}
        labels={model.invalid}
      />
    </>
  );
}

function FormContent({ model }: { model: ElicitationModel }): ReactElement {
  return (
    <View
      pointerEvents={model.inactive ? 'none' : 'auto'}
      className="gap-4 px-4 pt-4"
    >
      <ElicitationHeading
        source={model.props.source}
        message={model.props.request.message}
      />
      <ElicitationFields model={model} />
    </View>
  );
}
