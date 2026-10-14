import {
  Alert as SwiftAlert,
  Button as SwiftButton,
  Text,
} from '@expo/ui/swift-ui';
import { disabled } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Host } from '#primitives/native/host';
import {
  alertActionPress,
  isAlertActionEnabled,
  isAlertBusy,
  type AlertAction,
  type AlertProps,
} from './alert-props';

// SwiftUI's own centred alert, for confirmations too: a danger answer is its destructive role.
export function Alert(props: AlertProps): React.JSX.Element {
  return (
    <Host matchContents>
      <PlainAlert {...props} />
    </Host>
  );
}

type AlertActionsProps = Pick<AlertProps, 'actions' | 'onOpenChange'>;

// The props SwiftUI's alert presents itself from.
interface AlertPresentation {
  title: string;
  isPresented: boolean;
  onIsPresentedChange: (open: boolean) => void;
}

// A running answer hides the alert: iOS closes alerts before their action runs, and the screen shows progress.
function alertPresentation(props: AlertProps): AlertPresentation {
  return {
    title: props.title,
    isPresented: props.open && !isAlertBusy(props.actions),
    onIsPresentedChange: props.onOpenChange,
  };
}

function PlainAlert(props: AlertProps): React.JSX.Element {
  return (
    <SwiftAlert {...alertPresentation(props)}>
      <SwiftAlert.Trigger>
        <AnchorText />
      </SwiftAlert.Trigger>
      <SwiftAlert.Actions>
        <AlertActions {...props} />
      </SwiftAlert.Actions>
      <PlainAlertMessage message={props.message} />
    </SwiftAlert>
  );
}

function PlainAlertMessage(props: {
  message: AlertProps['message'];
}): React.JSX.Element | null {
  if (!props.message) return null;

  return (
    <SwiftAlert.Message>
      <Text>{props.message}</Text>
    </SwiftAlert.Message>
  );
}

// SwiftUI presents an alert from a view; an empty text is the smallest view that still presents it.
function AnchorText(): React.JSX.Element {
  return <Text>{''}</Text>;
}

function AlertActions(props: AlertActionsProps): React.JSX.Element {
  return (
    <>
      {props.actions.map((action) => (
        <SwiftButton
          key={action.label}
          label={action.label}
          role={actionRole(action)}
          onPress={alertActionPress(action, props.onOpenChange)}
          modifiers={[disabled(!isAlertActionEnabled(action, props.actions))]}
        />
      ))}
    </>
  );
}

function actionRole(action: AlertAction): 'cancel' | 'destructive' | undefined {
  return action.cancel ? 'cancel' : swiftRole(action.tone);
}

// SwiftUI names the danger tone's role `destructive`.
function swiftRole(tone: AlertAction['tone']): 'destructive' | undefined {
  return tone === 'danger' ? 'destructive' : undefined;
}

Alert satisfies React.ComponentType<AlertProps>;
