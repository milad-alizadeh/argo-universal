// Stock Compose AlertDialog: Expo UI has no universal alert; iOS uses SwiftUI's alert.
import { RNHostView } from '@expo/ui';
import { AlertDialog, Row, Text, TextButton } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { NativeText } from '#primitives/display/native-text';
import { Spinner } from '#primitives/display/spinner';
import { Host } from '#primitives/native/host';
import {
  alertActionPress,
  alertDismissal,
  isAlertActionEnabled,
  type AlertAction,
  type AlertProps,
} from './alert-props';

// Material's AlertDialog shows while it is drawn, so a closed alert draws nothing.
export function Alert(props: AlertProps): React.JSX.Element | null {
  if (!props.open) return null;

  return (
    <Host matchContents>
      <OpenAlert {...props} />
    </Host>
  );
}

function OpenAlert(props: AlertProps): React.JSX.Element {
  return (
    <AlertDialog
      colors={useDialogColors()}
      onDismissRequest={() => alertDismissal(props)(false)}
    >
      <AlertTitle title={props.title} />
      <AlertMessage message={props.message} />
      <AlertAnswers {...props} />
      <AlertCancel actions={props.actions} onOpenChange={props.onOpenChange} />
    </AlertDialog>
  );
}

// The card surface, the foreground title and the muted message, through AlertDialog's colors prop.
function useDialogColors(): React.ComponentProps<typeof AlertDialog>['colors'] {
  const colors = useNativeTheme().colors;

  return {
    containerColor: colors.card,
    titleContentColor: colors.foreground,
    textContentColor: colors.mutedForeground,
  };
}

function AlertTitle(props: Pick<AlertProps, 'title'>): React.JSX.Element {
  return (
    <AlertDialog.Title>
      <Text style={{ typography: 'headlineSmall' }}>{props.title}</Text>
    </AlertDialog.Title>
  );
}

function AlertAnswers(props: AlertProps): React.JSX.Element {
  const answers = props.actions.filter((action) => !action.cancel);

  return (
    <AlertDialog.ConfirmButton>
      <Row horizontalArrangement={{ spacedBy: 8 }}>
        {answers.map((action) => (
          <AlertButton key={action.label} {...props} action={action} />
        ))}
      </Row>
    </AlertDialog.ConfirmButton>
  );
}

function AlertMessage(props: {
  message: string | undefined;
}): React.JSX.Element | null {
  if (!props.message) return null;

  return (
    <AlertDialog.Text>
      <Text style={{ typography: 'bodyMedium' }}>{props.message}</Text>
    </AlertDialog.Text>
  );
}

function AlertCancel(
  props: Pick<AlertProps, 'actions' | 'onOpenChange'>,
): React.JSX.Element | null {
  const action = props.actions.find((candidate) => candidate.cancel);

  if (!action) return null;

  return (
    <AlertDialog.DismissButton>
      <AlertButton {...props} action={action} />
    </AlertDialog.DismissButton>
  );
}

type AlertButtonProps = Pick<AlertProps, 'actions' | 'onOpenChange'> & {
  action: AlertAction;
};

// Material's TextButton `enabled` greys an answer that cannot run; a running one leads with the spinner, as Button does.
function AlertButton(props: AlertButtonProps): React.JSX.Element {
  return (
    <TextButton
      enabled={isAlertActionEnabled(props.action, props.actions)}
      colors={useButtonColors(props.action)}
      onClick={alertActionPress(props.action, props.onOpenChange)}
    >
      <AlertButtonLabel action={props.action} />
    </TextButton>
  );
}

// The answer's tone as TextButton's content colour; a disabled one takes Material's disabled treatment, the foreground at 38%, not its tone.
function useButtonColors(
  action: AlertAction,
): React.ComponentProps<typeof TextButton>['colors'] {
  const colors = useNativeTheme().colors;

  return {
    contentColor: action.tone === 'danger' ? colors.danger : colors.accent,
    disabledContentColor: colors.disabledContent,
  };
}

// The label takes its colour from the TextButton around it.
function AlertButtonLabel({
  action,
}: Pick<AlertButtonProps, 'action'>): React.JSX.Element {
  return (
    <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: 8 }}>
      <AlertButtonSpinner action={action} />
      <NativeText role="control">{action.label}</NativeText>
    </Row>
  );
}

// The spinner runs in its answer's own tone.
function AlertButtonSpinner({
  action,
}: Pick<AlertButtonProps, 'action'>): React.JSX.Element | null {
  if (!action.loading) return null;

  return (
    <RNHostView matchContents>
      <Spinner
        accessibilityLabel={action.label}
        tone={action.tone === 'danger' ? 'danger' : 'accent'}
      />
    </RNHostView>
  );
}

Alert satisfies React.ComponentType<AlertProps>;
