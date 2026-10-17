import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import {
  RequestCard,
  type RequestCardProps,
} from '../request-card/request-card';
import { RequestHeading } from '../request-card/request-heading';
import { PermissionActions } from './permission-actions';
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
  'onEnter' | 'footerClassName' | 'actions'
>;

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
      <PermissionBody {...props} />
    </RequestCard>
  );
}

// Enter and the footer answer the request.
function answering(answers: PermissionAnswers): Answering {
  return {
    onEnter: answers.enter,
    footerClassName: 'justify-end',
    actions: (
      <PermissionActions
        {...answers}
        disabled={answers.inactive}
        onChoose={answers.choose}
        onPick={answers.pick}
      />
    ),
  };
}

function PermissionBody(props: PermissionRequestProps): ReactNode {
  return (
    <View className="gap-4 px-4 pt-1 wide:gap-3 wide:px-0 wide:pt-0">
      <RequestHeading
        icon="hand"
        title={props.request.title}
        hint={props.reason}
      />
      {props.input && <PermissionInput input={props.input} />}
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
