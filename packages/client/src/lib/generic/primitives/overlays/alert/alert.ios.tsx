import {
  Alert as SwiftAlert,
  Button as SwiftButton,
  ConfirmationDialog,
  Text,
} from '@expo/ui/swift-ui';
import type * as React from 'react';
import { Host } from '../../native/host';
import {
  alertActionPress,
  isDestructiveAlert,
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

function PlainAlert(props: AlertProps): React.JSX.Element {
  return (
    <SwiftAlert
      title={props.title}
      isPresented={props.open}
      onIsPresentedChange={props.onOpenChange}
    >
      <SwiftAlert.Trigger>
        <AnchorText />
      </SwiftAlert.Trigger>
      <SwiftAlert.Actions>
        <AlertActions {...props} />
      </SwiftAlert.Actions>
      {props.message ? (
        <SwiftAlert.Message>
          <Text>{props.message}</Text>
        </SwiftAlert.Message>
      ) : null}
    </SwiftAlert>
  );
}

function Confirmation(props: AlertProps): React.JSX.Element {
  return (
    <ConfirmationDialog
      title={props.title}
      titleVisibility="visible"
      isPresented={props.open}
      onIsPresentedChange={props.onOpenChange}
    >
      <ConfirmationDialog.Trigger>
        <AnchorText />
      </ConfirmationDialog.Trigger>
      <ConfirmationDialog.Actions>
        <AlertActions {...props} explicitCancel />
      </ConfirmationDialog.Actions>
      {props.message ? (
        <ConfirmationDialog.Message>
          <Text>{props.message}</Text>
        </ConfirmationDialog.Message>
      ) : null}
    </ConfirmationDialog>
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
function AlertActions(
  props: Pick<AlertProps, 'actions' | 'onOpenChange'> & {
    explicitCancel?: boolean;
  },
): React.JSX.Element {
  return (
    <>
      {props.actions.map((action) => (
        <SwiftButton
          key={action.label}
          label={action.label}
          role={
            props.explicitCancel && action.role === 'cancel'
              ? undefined
              : action.role
          }
          onPress={alertActionPress(action, props.onOpenChange)}
        />
      ))}
    </>
  );
}
