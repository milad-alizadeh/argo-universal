import { useRef, useEffect, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { Sheet, type SheetProps } from '#primitives/overlays/sheet';
import {
  useElicitationForm,
  type ElicitationModel,
} from '../../hooks/use-elicitation-form';
import { useElicitationQuestions } from '../../hooks/use-elicitation-questions';
import {
  ElicitationFieldForm,
  type ElicitationFormProps,
} from './elicitation-form';
import { sourceLabel } from './elicitation-form-body';
import { ElicitationQuestionBody } from './elicitation-question-form';
import {
  elicitationQuestions,
  type ElicitationQuestion,
} from './elicitation-questions';
import {
  ElicitationSheetFields,
  sheetFieldsScroll,
} from './elicitation-sheet-fields';
import { ElicitationSheetFooter } from './elicitation-sheet-footer';

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

  if (useContentWide()) return <FieldTray {...props} model={model} />;

  return (
    <ElicitationSurface
      {...props}
      title={sourceLabel(props.source)}
      footer={<ElicitationSheetFooter model={model} />}
      contentScrolls={sheetFieldsScroll}
    >
      <ElicitationSheetFields model={model} />
    </ElicitationSurface>
  );
}

// The wide tray keeps the card with its actions; a sheet pins them in its footer.
function FieldTray({
  model,
  ...props
}: ElicitationFormProps & { model: ElicitationModel }): ReactElement {
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

// A title names the sheet's one page; without one the content's own heading leads, as each question's does.
type SurfaceProps = ElicitationFormProps &
  Pick<SheetProps, 'footer' | 'contentScrolls'> & {
    title?: string;
    children: ReactNode;
  };

function ElicitationSurface(props: SurfaceProps): ReactElement {
  const wide = useContentWide();
  const sheet = useSheetDismissal(props);

  if (wide) return <ElicitationTray>{props.children}</ElicitationTray>;

  return (
    <Sheet
      open
      label={props.request.message}
      {...sheetLayout(props)}
      {...sheet}
    >
      {sheetContent(props)}
    </Sheet>
  );
}

const sheetLayout = ({
  footer,
  contentScrolls,
}: SurfaceProps): Pick<SheetProps, 'footer' | 'contentScrolls'> => ({
  footer,
  contentScrolls,
});

// Sheet finds its pages among its direct children, so this returns the page itself rather than a component.
function sheetContent({
  title,
  children,
}: Pick<SurfaceProps, 'title' | 'children'>): ReactNode {
  if (!title) return children;

  return (
    <Sheet.Page name="form" title={title}>
      {children}
    </Sheet.Page>
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
      className="self-stretch mx-1.75 -mb-3 pb-3 rounded-t-xl bg-content/80 shadow-tray web:backdrop-blur-glass web:backdrop-saturate-110"
    >
      {children}
    </View>
  );
}
