import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '#lib/generic/primitives/overlays/dialog/dialog';
import { dismissLogin, loginActions, loginStatus } from './login-actions';
import { LoginButton } from './login-button';
import { loginCopy } from './login-copy';
import type { AgentLoginSheetProps } from './login-props';
export type { AgentLoginSheetProps } from './login-props';

export function AgentLoginSheet(
  props: AgentLoginSheetProps,
): React.JSX.Element {
  return (
    <Dialog open onOpenChange={(open) => !open && dismissLogin(props)}>
      <LoginContent {...props} />
    </Dialog>
  );
}

function LoginContent(props: AgentLoginSheetProps): React.JSX.Element {
  const copy = sheetCopy(props);
  return (
    <DialogContent
      showClose={false}
      accessibilityLabel={copy.title}
      dismissible={false}
      className="gap-3 p-6 wide:w-[380px] wide:rounded-surface"
    >
      <DialogTitle className="type-heading">{copy.title}</DialogTitle>
      <Text>{copy.message}</Text>
      <LoginActions {...props} />
    </DialogContent>
  );
}

function sheetCopy(props: AgentLoginSheetProps): {
  title: string;
  message: string;
} {
  if (props.disconnected)
    return {
      title: 'Connection lost',
      message:
        'Reconnect to check this sign-in. Its outcome is unknown while the Server is unreachable.',
    };
  if (props.failure) return { title: 'Sign-in failed', message: props.failure };
  return connectedCopy(props);
}

function connectedCopy(props: AgentLoginSheetProps): {
  title: string;
  message: string;
} {
  const copy = loginCopy[loginStatus(props)];
  return {
    title: sheetTitle(props),
    message: agentMessage(props) ?? copy.message,
  };
}
const agentMessage = (props: AgentLoginSheetProps): string | undefined =>
  props.snapshot?.request?.message;
function sheetTitle(props: AgentLoginSheetProps): string {
  if (loginStatus(props) === 'choose-method')
    return `Sign in to ${props.agentName}`;
  return loginCopy[loginStatus(props)].title;
}

function LoginActions(props: AgentLoginSheetProps): React.JSX.Element {
  return (
    <View className="gap-2">
      {loginActions(props).map((action, index) => (
        <LoginButton
          key={action.id}
          {...action}
          fullWidth
          disabled={props.busy}
          variant={index ? 'secondary' : 'default'}
        />
      ))}
    </View>
  );
}
