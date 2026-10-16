import type * as React from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/buttons/button';
import { Text } from '#primitives/display/text';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '#primitives/overlays/dialog';
import { AgentLoginTerminal } from '../agent-login-terminal/agent-login-terminal';
import { dismissLogin, loginActions, loginStatus } from './login-actions';
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
  return (
    <DialogContent {...contentProps(props)}>
      <DialogTitle className="type-heading">
        {sheetCopy(props).title}
      </DialogTitle>
      <LoginMessage {...props} />
      <LoginTerminalContent {...props} />
      <LoginActions {...props} />
    </DialogContent>
  );
}

const isTerminalLogin = (props: AgentLoginSheetProps): boolean =>
  props.snapshot?.terminal === true;

const contentProps = (
  props: AgentLoginSheetProps,
): Omit<React.ComponentProps<typeof DialogContent>, 'children'> => ({
  showClose: false,
  accessibilityLabel: sheetCopy(props).title,
  dismissible: false,
  className: isTerminalLogin(props)
    ? 'gap-3 p-6 wide:w-155 wide:max-w-none wide:rounded-sheet'
    : 'gap-3 p-6 wide:w-95 wide:rounded-sheet',
});

const terminalHasCopy = (props: AgentLoginSheetProps): boolean =>
  isTerminalLogin(props) && !props.disconnected;

function LoginMessage(props: AgentLoginSheetProps): React.JSX.Element | null {
  if (terminalHasCopy(props) && !props.failure) return null;

  return <Text>{sheetCopy(props).message}</Text>;
}

const terminalDisabled = (props: AgentLoginSheetProps): boolean =>
  !!(props.disconnected || props.failure || props.busy);

function LoginTerminalContent(
  props: AgentLoginSheetProps,
): React.JSX.Element | null {
  if (!isTerminalLogin(props)) return null;
  const operationId = terminalIdentity(props);

  if (!props.terminal) return null;

  return (
    <AgentLoginTerminal
      key={operationId}
      {...props.terminal}
      enabled={!terminalDisabled(props)}
    />
  );
}

type SheetCopy = { title: string; message: string };

function sheetCopy(props: AgentLoginSheetProps): SheetCopy {
  if (props.disconnected)
    return {
      title: 'Connection lost',
      message:
        'Reconnect to check this sign-in. Its outcome is unknown while the Server is unreachable.',
    };

  if (props.failure) return { title: 'Sign-in failed', message: props.failure };

  return connectedCopy(props);
}

function connectedCopy(props: AgentLoginSheetProps): SheetCopy {
  const copy = loginCopy[loginStatus(props)];

  return {
    title: sheetTitle(props),
    message: agentMessage(props) ?? copy.message,
  };
}

const agentMessage = (props: AgentLoginSheetProps): string | undefined =>
  props.snapshot?.request?.message;

function sheetTitle(props: AgentLoginSheetProps): string {
  if (isTerminalLogin(props) || loginStatus(props) === 'choose-method')
    return `Sign in to ${props.agentName}`;

  return loginCopy[loginStatus(props)].title;
}

function LoginActions(props: AgentLoginSheetProps): React.JSX.Element {
  return (
    <View className={props.snapshot?.terminal ? 'items-end gap-2' : 'gap-2'}>
      {loginActions(props).map((action, index) => (
        <Button
          key={action.id}
          {...action}
          fullWidth={!props.snapshot?.terminal}
          disabled={props.busy}
          variant={actionVariant(index, isTerminalLogin(props))}
        />
      ))}
    </View>
  );
}

const actionVariant = (
  index: number,
  terminal: boolean,
): 'secondary' | 'default' => {
  if (terminal) return 'secondary';

  return index ? 'secondary' : 'default';
};

const terminalIdentity = (props: AgentLoginSheetProps): string | undefined =>
  props.snapshot?.operationId;
