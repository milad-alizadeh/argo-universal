import { AlertDialog, Row, Text, TextButton } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import {
  alertActionPress,
  type AlertAction,
  type AlertProps,
} from './alert-props';
import { Host } from './host';

// Material's AlertDialog shows while it is drawn, so a closed alert draws nothing.
export function Alert(props: AlertProps): React.JSX.Element | null {
  const { colors } = useNativeTheme();
  if (!props.open) return null;
  const answers = props.actions.filter((action) => action.role !== 'cancel');
  const cancel = props.actions.find((action) => action.role === 'cancel');
  return (
    <Host matchContents>
      <AlertDialog
        onDismissRequest={() => props.onOpenChange(false)}
        colors={{
          containerColor: colors.popover,
          titleContentColor: colors.popoverForeground,
          textContentColor: colors.mutedForeground,
        }}
      >
        <AlertDialog.Title>
          <Text style={{ typography: 'headlineSmall' }}>{props.title}</Text>
        </AlertDialog.Title>
        <AlertMessage message={props.message} />
        <AlertDialog.ConfirmButton>
          <Row horizontalArrangement={{ spacedBy: 8 }}>
            {answers.map((action) => (
              <AlertButton key={action.label} action={action} {...props} />
            ))}
          </Row>
        </AlertDialog.ConfirmButton>
        <AlertCancel action={cancel} onOpenChange={props.onOpenChange} />
      </AlertDialog>
    </Host>
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
  props: Pick<AlertProps, 'onOpenChange'> & { action: AlertAction | undefined },
): React.JSX.Element | null {
  if (!props.action) return null;
  return (
    <AlertDialog.DismissButton>
      <AlertButton action={props.action} onOpenChange={props.onOpenChange} />
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
