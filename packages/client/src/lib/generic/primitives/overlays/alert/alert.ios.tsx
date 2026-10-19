// Stock SwiftUI alert: Expo UI has no universal alert; Android uses Compose's AlertDialog.
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
  answeredAlert,
  type AlertProps,
  type AnsweredAlertProps,
} from './alert-props';

// Every question, a destructive one too, is the stock centred alert with its answers side by side (Paper).
export function Alert(props: AlertProps): React.JSX.Element {
  return (
    <Host matchContents>
      <PlainAlert {...answeredAlert(props)} />
    </Host>
  );
}

type AlertActionsProps = Pick<AnsweredAlertProps, 'actions' | 'onOpenChange'>;

// The props SwiftUI's alert presents itself from.
interface AlertPresentation {
  title: string;
  isPresented: boolean;
  onIsPresentedChange: (open: boolean) => void;
}

// A running answer hides the alert: SwiftUI closes it on any press and draws no progress, so the screen shows it.
function alertPresentation(props: AnsweredAlertProps): AlertPresentation {
  return {
    title: props.title,
    isPresented: props.open && !isAlertBusy(props.actions),
    onIsPresentedChange: props.onOpenChange,
  };
}

function PlainAlert(props: AnsweredAlertProps): React.JSX.Element {
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
  message: AnsweredAlertProps['message'];
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

function actionRole(
  action: AnsweredAlertProps['actions'][number],
): 'cancel' | 'destructive' | undefined {
  if (action.cancel) return 'cancel';

  return swiftRole(action.tone);
}

// SwiftUI names the danger tone's role `destructive`.
function swiftRole(tone: AlertAction['tone']): 'destructive' | undefined {
  return tone === 'danger' ? 'destructive' : undefined;
}

Alert satisfies React.ComponentType<AlertProps>;
