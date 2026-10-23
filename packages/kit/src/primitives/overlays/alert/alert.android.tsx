// Stock Compose AlertDialog: Expo UI has no universal alert; iOS uses SwiftUI's alert.
import {
  AlertDialog,
  CircularProgressIndicator,
  Row,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import { semantics, size } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { NativeText } from '#primitives/content/native-text';
import { Host } from '#primitives/native/host';
import { useMaterialPalette } from '#primitives/native/material-palette';
import {
  alertActionPress,
  ignoreCloseWhileBusy,
  isAlertActionEnabled,
  isCancel,
  isDestructive,
  type AlertAction,
  answeredAlert,
  type AlertProps,
  type AnsweredAlertProps,
} from './alert-props';

// Material's AlertDialog shows while it is drawn, so a closed alert draws nothing.
export function Alert(props: AlertProps): React.JSX.Element | null {
  if (!props.open) return null;

  return (
    <Host matchContents>
      <OpenAlert {...answeredAlert(props)} />
    </Host>
  );
}

function OpenAlert(props: AnsweredAlertProps): React.JSX.Element {
  return (
    <AlertDialog onDismissRequest={() => ignoreCloseWhileBusy(props)(false)}>
      <AlertTitle title={props.title} />
      <AlertMessage message={props.message} />
      <AlertAnswers {...props} />
      <AlertCancel actions={props.actions} onOpenChange={props.onOpenChange} />
    </AlertDialog>
  );
}

function AlertTitle(
  props: Pick<AnsweredAlertProps, 'title'>,
): React.JSX.Element {
  return (
    <AlertDialog.Title>
      <Text style={{ typography: 'headlineSmall' }}>{props.title}</Text>
    </AlertDialog.Title>
  );
}

function AlertAnswers(props: AnsweredAlertProps): React.JSX.Element {
  const answers = props.actions.filter((action) => !isCancel(action));

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
  props: Pick<AnsweredAlertProps, 'actions' | 'onOpenChange'>,
): React.JSX.Element | null {
  const action = props.actions.find(isCancel);

  if (!action) return null;

  return (
    <AlertDialog.DismissButton>
      <AlertButton {...props} action={action} />
    </AlertDialog.DismissButton>
  );
}

type AlertButtonProps = Pick<AnsweredAlertProps, 'actions' | 'onOpenChange'> & {
  action: AlertAction;
};

// Material's TextButton `enabled` greys an answer that cannot run; a running one leads with the spinner, as Button does.
function AlertButton(props: AlertButtonProps): React.JSX.Element {
  return (
    <TextButton
      enabled={isAlertActionEnabled(props.action, props.actions)}
      colors={useAnswerColors(props.action)}
      onClick={alertActionPress(props.action, props.onOpenChange)}
    >
      <AlertButtonLabel action={props.action} />
    </TextButton>
  );
}

// The answer's tone; a disabled answer takes Material's 38% foreground instead.
function useAnswerColors(
  action: AlertAction,
): React.ComponentProps<typeof TextButton>['colors'] {
  const palette = useMaterialPalette();

  return isDestructive(action)
    ? palette.dialogDangerColors
    : palette.dialogAnswerColors;
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

// Material's button icon size, ButtonDefaults.IconSize.
const spinnerSize = 18;

// A running answer is disabled, so its spinner takes the label's disabled colour.
function AlertButtonSpinner({
  action,
}: Pick<AlertButtonProps, 'action'>): React.JSX.Element | null {
  const color = useMaterialPalette().roles.disabledContent;

  if (!action.loading) return null;

  return (
    <CircularProgressIndicator
      color={color}
      modifiers={[
        size(spinnerSize, spinnerSize),
        semantics({ contentDescription: action.label }),
      ]}
    />
  );
}

Alert satisfies React.ComponentType<AlertProps>;
