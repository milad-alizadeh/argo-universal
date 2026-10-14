import {
  AlertDialog,
  CircularProgressIndicator,
  Column,
  Row,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { type NativeColors, useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#primitives/native/host';
import {
  alertActionPress,
  alertDismissal,
  isAlertActionEnabled,
  isAlertBusy,
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
      onDismissRequest={() => alertDismissal(props)(false)}
      colors={alertColors(colors)}
    >
      <AlertTitle title={props.title} />
      <AlertMessage message={props.message} busy={isAlertBusy(props.actions)} />
      <AlertAnswers {...props} />
      <AlertCancel actions={props.actions} onOpenChange={props.onOpenChange} />
    </AlertDialog>
  );
}

function alertColors(
  colors: NativeColors,
): React.ComponentProps<typeof AlertDialog>['colors'] {
  return {
    containerColor: colors.card,
    titleContentColor: colors.cardForeground,
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
          <AlertButton key={action.label} action={action} {...props} />
        ))}
      </Row>
    </AlertDialog.ConfirmButton>
  );
}

// Material's circular indicator sits under the message while an answer runs.
const progressSize = 20;

const progressGap = 16;

type AlertMessageProps = { message: string | undefined; busy: boolean };

const hasAlertBody = (props: AlertMessageProps): boolean =>
  Boolean(props.message) || props.busy;

function AlertMessage(props: AlertMessageProps): React.JSX.Element | null {
  if (!hasAlertBody(props)) return null;

  return (
    <AlertDialog.Text>
      <Column verticalArrangement={{ spacedBy: progressGap }}>
        <AlertMessageText message={props.message} />
        <AlertProgress busy={props.busy} />
      </Column>
    </AlertDialog.Text>
  );
}

function AlertMessageText(props: {
  message: string | undefined;
}): React.JSX.Element | null {
  if (!props.message) return null;

  return <Text style={{ typography: 'bodyMedium' }}>{props.message}</Text>;
}

function AlertProgress(props: { busy: boolean }): React.JSX.Element | null {
  const { colors } = useNativeTheme();

  if (!props.busy) return null;

  return (
    <CircularProgressIndicator
      color={colors.mutedForeground}
      trackColor="transparent"
      modifiers={[size(progressSize, progressSize)]}
    />
  );
}

function AlertCancel(
  props: Pick<AlertProps, 'actions' | 'onOpenChange'>,
): React.JSX.Element | null {
  const action = props.actions.find((candidate) => candidate.cancel);

  if (!action) return null;

  return (
    <AlertDialog.DismissButton>
      <AlertButton
        action={action}
        actions={props.actions}
        onOpenChange={props.onOpenChange}
      />
    </AlertDialog.DismissButton>
  );
}

function AlertButton(
  props: Pick<AlertProps, 'onOpenChange' | 'actions'> & { action: AlertAction },
): React.JSX.Element {
  const { colors } = useNativeTheme();

  const color = props.action.tone === 'danger' ? colors.danger : colors.primary;

  return (
    <TextButton
      onClick={alertActionPress(props.action, props.onOpenChange)}
      enabled={isAlertActionEnabled(props.action, props.actions)}
      colors={{ contentColor: color }}
    >
      <Text style={{ typography: 'labelLarge' }}>{props.action.label}</Text>
    </TextButton>
  );
}

Alert satisfies React.ComponentType<AlertProps>;
