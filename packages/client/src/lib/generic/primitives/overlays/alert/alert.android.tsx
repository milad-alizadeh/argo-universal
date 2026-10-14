import { AlertDialog, Row, Text, TextButton } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { type NativeColors, useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#primitives/native/host';
import {
  alertActionPress,
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
  const { colors } = useNativeTheme();

  return (
    <AlertDialog
      onDismissRequest={() => props.onOpenChange(false)}
      colors={alertColors(colors)}
    >
      <AlertTitle title={props.title} />
      <AlertMessage message={props.message} />
      <AlertAnswers {...props} />
      <AlertCancel actions={props.actions} onOpenChange={props.onOpenChange} />
    </AlertDialog>
  );
}

function alertColors(
  colors: NativeColors,
): React.ComponentProps<typeof AlertDialog>['colors'] {
  return {
    containerColor: colors.popover,
    titleContentColor: colors.popoverForeground,
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
  const answers = props.actions.filter((action) => action.role !== 'cancel');

  return (
    <AlertDialog.ConfirmButton>
      <Row horizontalArrangement={{ spacedBy: 8 }}>
        {answers.map((action) => (
          <AlertButton key={action.label} action={action} {...props} />
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
  const action = props.actions.find((candidate) => candidate.role === 'cancel');

  if (!action) return null;

  return (
    <AlertDialog.DismissButton>
      <AlertButton action={action} onOpenChange={props.onOpenChange} />
    </AlertDialog.DismissButton>
  );
}

function AlertButton(
  props: Pick<AlertProps, 'onOpenChange'> & { action: AlertAction },
): React.JSX.Element {
  const { colors } = useNativeTheme();

  const color =
    props.action.role === 'destructive' ? colors.destructive : colors.primary;

  return (
    <TextButton
      onClick={alertActionPress(props.action, props.onOpenChange)}
      colors={{ contentColor: color }}
    >
      <Text style={{ typography: 'labelLarge' }}>{props.action.label}</Text>
    </TextButton>
  );
}

Alert satisfies React.ComponentType<AlertProps>;
