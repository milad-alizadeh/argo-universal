import { Alert, type AlertAction } from '@repo/kit/primitives/overlays/alert';
import type * as React from 'react';

export interface DeviceUnpairAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The Device being asked about, by the name it gave itself.
  name: string;
  onUnpair: () => void;
}

const unpairCopy = { action: 'Unpair', cancel: 'Cancel' };

// Asks first and offers no Undo: pairing again needs the other Device in hand. The answer is red text only.
export const DeviceUnpairAlert = (
  props: DeviceUnpairAlertProps,
): React.JSX.Element => (
  <Alert
    open={props.open}
    onOpenChange={props.onOpenChange}
    title={`Unpair “${props.name}”?`}
    message="It loses access to this computer straight away, even mid-Session. To use it again you’ll need to pair it again, with the Device in hand."
    actions={actions(props.onUnpair)}
  />
);

const actions = (onUnpair: () => void): AlertAction[] => [
  { label: unpairCopy.cancel, role: 'cancel' },
  { label: unpairCopy.action, tone: 'danger', onPress: onUnpair },
];
