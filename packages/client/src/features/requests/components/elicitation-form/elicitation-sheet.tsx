import { useRef, useEffect, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { BottomSheet } from '#primitives/overlays/bottom-sheet/bottom-sheet';
import { useElicitationForm } from '../../hooks/use-elicitation-form';
import { useElicitationQuestions } from '../../hooks/use-elicitation-questions';
import {
  ElicitationFieldForm,
  type ElicitationFormProps,
} from './elicitation-form';
import { ElicitationQuestionBody } from './elicitation-question-form';
import {
  elicitationQuestions,
  type ElicitationQuestion,
} from './elicitation-questions';

export function ElicitationSheet(props: ElicitationFormProps): ReactElement {
  const questions = elicitationQuestions(props.request);
  if (questions)
    return (
      <QuestionSheet
        key={props.request.requestId}
        {...props}
        questions={questions}
      />
    );
  return <FieldSheet key={props.request.requestId} {...props} />;
}

function FieldSheet(props: ElicitationFormProps): ReactElement {
  const model = useElicitationForm(props);
  return (
    <ElicitationSurface {...props}>
      <ElicitationFieldForm model={model} />
    </ElicitationSurface>
  );
}

function QuestionSheet(
  props: ElicitationFormProps & { questions: ElicitationQuestion[] },
): ReactElement {
  const model = useElicitationQuestions(props, props.questions);
  return (
    <ElicitationSurface {...props}>
      <ElicitationQuestionBody model={model} />
    </ElicitationSurface>
  );
}

function ElicitationSurface(
  props: ElicitationFormProps & { children: ReactNode },
): ReactElement {
  const wide = useContentWide();
  const dismissed = useRef(false);
  useEffect(() => {
    dismissed.current = false;
  }, [props.request.requestId, props.error]);
  const dismissible = props.state.kind === 'open';
  const dismiss = (open: boolean): void => {
    if (open || !dismissible || dismissed.current) return;
    dismissed.current = true;
    props.onAnswer({ action: 'cancel' });
  };
  if (wide)
    return (
      <View
        role="region"
        aria-label="Elicitation questions"
        className="self-stretch mx-1.75 -mb-3 pb-3 rounded-t-xl bg-sidebar/80 shadow-glass-tray web:backdrop-blur-glass web:backdrop-saturate-110"
      >
        {props.children}
      </View>
    );
  return (
    <BottomSheet
      open
      fit
      size="form"
      label={props.request.message}
      dismissible={dismissible}
      onOpenChange={dismiss}
    >
      {props.children}
    </BottomSheet>
  );
}
