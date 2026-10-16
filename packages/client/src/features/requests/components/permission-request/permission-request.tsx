import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/display/text';
import {
  RequestCard,
  type RequestCardProps,
} from '../request-card/request-card';
import { RequestHeading } from '../request-card/request-heading';
import { PermissionActions } from './permission-actions';
import { DenialActions, DenialField } from './permission-denial';
import {
  type PermissionAnswers,
  type PermissionAnswersInput,
  usePermissionAnswers,
} from './use-permission-answers';

export interface PermissionRequestProps extends PermissionAnswersInput {
  input?: string;
  reason?: string;
  error?: string;
}

type Answering = Pick<
  RequestCardProps,
  'onEnter' | 'onEscape' | 'footerClassName' | 'actions'
>;

type BodyProps = PermissionRequestProps & { answers: PermissionAnswers };

export function PermissionRequest(props: PermissionRequestProps): ReactNode {
  const answers = usePermissionAnswers(props);

  return (
    <RequestCard
      surface="tray"
      sheetLabel={props.request.title}
      state={props.state}
      error={props.error}
      {...answering(answers)}
    >
      <PermissionBody {...props} answers={answers} />
    </RequestCard>
  );
}

// Enter, Escape and the footer answer the request.
function answering(answers: PermissionAnswers): Answering {
  return {
    onEnter: answers.enter,
    onEscape: answers.escape,
    footerClassName: cn('justify-end', answers.denying && 'justify-between'),
    actions: <AnswerActions {...answers} />,
  };
}

// While denying, the footer holds Back and Deny in place of the options.
function AnswerActions(answers: PermissionAnswers): ReactNode {
  if (answers.denying) return <DenialActions {...answers} />;

  return (
    <PermissionActions
      {...answers}
      disabled={answers.inactive}
      onChoose={answers.choose}
      onPick={answers.pick}
    />
  );
}

function PermissionBody({ answers, ...props }: BodyProps): ReactNode {
  return (
    <View className="gap-4 px-4 pt-1 wide:gap-3 wide:px-0 wide:pt-0">
      <RequestHeading
        icon="hand"
        title={props.request.title}
        hint={props.reason}
      />
      {props.input && <PermissionInput input={props.input} />}
      {answers.denying && <DenialField {...props} answers={answers} />}
    </View>
  );
}

function PermissionInput({ input }: { input: string }): ReactNode {
  return (
    <View className="min-h-13 rounded-xl android:rounded-2xl bg-muted px-4 py-3.5 wide:min-h-11 wide:bg-card wide:px-3.5 wide:py-2 wide:shadow-control">
      <Text role="code">{input}</Text>
    </View>
  );
}
