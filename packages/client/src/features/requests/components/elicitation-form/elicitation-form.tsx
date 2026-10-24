import type { ReactElement } from 'react';
import {
  useElicitationForm,
  type ElicitationModel,
} from '../../hooks/use-elicitation-form';
import {
  useElicitationQuestions,
  type QuestionModel,
} from '../../hooks/use-elicitation-questions';
import { ElicitationFields } from './elicitation-fields';
import { ElicitationValidation } from './elicitation-form-body';
import type { ElicitationFormProps } from './elicitation-form-props';
import {
  ElicitationLayout,
  type ElicitationPlacement,
  type ElicitationView,
} from './elicitation-layout';
import { QuestionPager } from './elicitation-question-pager';
import { QuestionRows } from './elicitation-question-rows';
import {
  elicitationQuestions,
  type ElicitationQuestion,
} from './elicitation-questions';

export type { ElicitationValues } from './elicitation-schema';

export type {
  ElicitationAnswer,
  ElicitationFormProps,
} from './elicitation-form-props';

// The request as a card, in a Feed's request frame.
export function ElicitationForm(props: ElicitationFormProps): ReactElement {
  return (
    <ElicitationContent
      key={props.request.requestId}
      {...props}
      placement="card"
    />
  );
}

type ContentProps = ElicitationFormProps & { placement: ElicitationPlacement };

/*
 * Every form-mode request draws as the same card. Choices with nothing else to check page one
 * question at a time; any other form is one page of fields, headed by its message.
 */
export function ElicitationContent(props: ContentProps): ReactElement {
  const questions = elicitationQuestions(props.request);

  return questions ? (
    <QuestionContent {...props} questions={questions} />
  ) : (
    <FieldsContent {...props} />
  );
}

type QuestionProps = ContentProps & { questions: ElicitationQuestion[] };

function QuestionContent(props: QuestionProps): ReactElement {
  const model = useElicitationQuestions(props, props.questions);

  return (
    <ElicitationLayout
      placement={props.placement}
      view={questionView(props, model)}
    />
  );
}

function questionView(
  props: ContentProps,
  model: QuestionModel,
): ElicitationView {
  return {
    props,
    state: props.state,
    error: props.error,
    header: questionHeader(model),
    rows: <QuestionRows model={model} />,
    actions: questionActions(props, model),
    inactive: model.inactive,
    onEnter: model.advance,
  };
}

function questionActions(
  props: ContentProps,
  model: QuestionModel,
): ElicitationView['actions'] {
  return {
    last: model.last,
    submitting: props.state.kind === 'submitting',
    canSubmit: model.canAdvance,
    onSubmit: model.advance,
    onSkip: model.skip,
  };
}

// A lone question is the message itself; several are each headed by their own.
function questionHeader(model: QuestionModel): ElicitationView['header'] {
  if (model.count === 1) return { title: model.props.request.message };

  return {
    title: model.question.title,
    progress: `${model.index + 1} of ${model.count}`,
    pager: <QuestionPager model={model} />,
  };
}

function FieldsContent(props: ContentProps): ReactElement {
  const model = useElicitationForm(props);

  return (
    <ElicitationLayout
      placement={props.placement}
      view={fieldsView(props, model)}
    />
  );
}

function fieldsView(
  props: ContentProps,
  model: ElicitationModel,
): ElicitationView {
  return {
    props,
    ...requestState(model),
    header: { title: props.request.message },
    rows: <ElicitationFields model={model} />,
    validation: <FieldsValidation model={model} />,
    actions: fieldsActions(model),
    inactive: model.inactive,
    onEnter: () => model.answer('accept'),
  };
}

const requestState = (
  model: ElicitationModel,
): Pick<ElicitationView, 'state' | 'error'> => ({
  state: model.state,
  error: model.error,
});

function FieldsValidation({
  model,
}: {
  model: ElicitationModel;
}): ReactElement {
  return (
    <ElicitationValidation
      answered={model.state.kind === 'answered'}
      labels={model.invalid}
    />
  );
}

// Skip declines the form: there is nothing to page past.
function fieldsActions(model: ElicitationModel): ElicitationView['actions'] {
  return {
    last: true,
    submitting: model.submitting,
    canSubmit: model.isValid,
    onSubmit: () => model.answer('accept'),
    onSkip: () => model.answer('decline'),
  };
}
