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

type SurfaceProps = ElicitationFormProps & { children: ReactNode };

function ElicitationSurface(props: SurfaceProps): ReactElement {
  const wide = useContentWide();
  const sheet = useSheetDismissal(props);

  if (wide) return <ElicitationTray>{props.children}</ElicitationTray>;

  return (
    <BottomSheet open fit size="form" label={props.request.message} {...sheet}>
      {props.children}
    </BottomSheet>
  );
}

type SheetDismissal = {
  dismissible: boolean;
  onOpenChange: (open: boolean) => void;
};

function useSheetDismissal(props: ElicitationFormProps): SheetDismissal {
  const dismissible = props.state.kind === 'open';
  const cancel = useCancelOnce(props);

  return {
    dismissible,
    onOpenChange: (open): void => {
      if (!open && dismissible) cancel();
    },
  };
}

// The sheet may report its close more than once; only the first cancels, until the request or its error changes.
function useCancelOnce(props: ElicitationFormProps): () => void {
  const dismissed = useRef(false);
  useEffect(() => {
    dismissed.current = false;
  }, [props.request.requestId, props.error]);

  return (): void => {
    if (dismissed.current) return;
    dismissed.current = true;
    props.onAnswer({ action: 'cancel' });
  };
}

function ElicitationTray({ children }: { children: ReactNode }): ReactElement {
  return (
    <View
      role="region"
      aria-label="Elicitation questions"
      className="self-stretch mx-1.75 -mb-3 pb-3 rounded-t-xl bg-sidebar/80 shadow-glass-tray web:backdrop-blur-glass web:backdrop-saturate-110"
    >
      {children}
    </View>
  );
}
