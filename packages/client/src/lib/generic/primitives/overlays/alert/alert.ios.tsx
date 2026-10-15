// Stock SwiftUI alert: Expo UI has no universal alert; Android uses Compose's AlertDialog.
import {
  Alert as SwiftAlert,
  Button as SwiftButton,
  ConfirmationDialog,
  Text,
} from '@expo/ui/swift-ui';
import { disabled } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Host } from '#primitives/native/host';
import {
  alertActionPress,
  isAlertActionEnabled,
  isAlertBusy,
  isDestructiveAlert,
  type AlertAction,
  type AlertProps,
} from './alert-props';

// A destructive question is a confirmation dialog, which iOS raises from the bottom with its own Cancel.
export function Alert(props: AlertProps): React.JSX.Element {
  return (
    <Host matchContents>
      {isDestructiveAlert(props.actions) ? (
        <Confirmation {...props} />
      ) : (
        <PlainAlert {...props} />
      )}
    </Host>
  );
}

type AlertActionsProps = Pick<AlertProps, 'actions' | 'onOpenChange'> & {
  explicitCancel?: boolean;
};

// The props SwiftUI's alert presents itself from.
interface AlertPresentation {
  title: string;
  isPresented: boolean;
  onIsPresentedChange: (open: boolean) => void;
}

// A running answer hides the alert: SwiftUI closes it on any press and draws no progress, so the screen shows it.
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

function Confirmation(props: AlertProps): React.JSX.Element {
  return (
    <ConfirmationDialog {...alertPresentation(props)} titleVisibility="visible">
      <ConfirmationDialog.Trigger>
        <AnchorText />
      </ConfirmationDialog.Trigger>
      <ConfirmationDialog.Actions>
        <AlertActions {...props} explicitCancel />
      </ConfirmationDialog.Actions>
      <ConfirmationMessage message={props.message} />
    </ConfirmationDialog>
  );
}

function ConfirmationMessage(props: {
  message: AlertProps['message'];
}): React.JSX.Element | null {
  if (!props.message) return null;

  return (
    <ConfirmationDialog.Message>
      <Text>{props.message}</Text>
    </ConfirmationDialog.Message>
  );
}

// SwiftUI presents an alert from a view; an empty text is the smallest view that still presents it.
function AnchorText(): React.JSX.Element {
  return <Text>{''}</Text>;
}

/*
 * iOS 26 hides a confirmation dialog's cancel-role button when it anchors the dialog to its source,
 * so Paper's explicit Cancel is drawn as a plain button there; tapping outside still dismisses.
 */
function AlertActions(props: AlertActionsProps): React.JSX.Element {
  return (
    <>
      {props.actions.map((action) => (
        <SwiftButton
          key={action.label}
          label={action.label}
          role={actionRole(action, props.explicitCancel)}
          onPress={alertActionPress(action, props.onOpenChange)}
          modifiers={[disabled(!isAlertActionEnabled(action, props.actions))]}
        />
      ))}
    </>
  );
}

function actionRole(
  action: AlertProps['actions'][number],
  explicitCancel: boolean | undefined,
): 'cancel' | 'destructive' | undefined {
  if (action.cancel) return explicitCancel ? undefined : 'cancel';

  return swiftRole(action.tone);
}

// SwiftUI names the danger tone's role `destructive`.
function swiftRole(tone: AlertAction['tone']): 'destructive' | undefined {
  return tone === 'danger' ? 'destructive' : undefined;
}

Alert satisfies React.ComponentType<AlertProps>;
