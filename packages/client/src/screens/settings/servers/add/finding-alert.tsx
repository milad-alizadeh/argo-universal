import { Alert } from '@repo/kit/primitives/overlays/alert';
import type * as React from 'react';

export interface FindingAlertProps {
  serverName: string;
  onAction: () => void;
}

// The look ends by finding the Server or by an answer, never by closing the card.
function stays(): void {
  /* nothing closes it but the answer */
}

/*
 * The look for the Server on the network, which a code does not hand over (card 2A): a card over the scanner, shaped like the wait for approval that follows it. Its one answer is Cancel.
 */
export function FindingAlert(props: FindingAlertProps): React.JSX.Element {
  return (
    <Alert
      open
      busy
      onOpenChange={stays}
      title={`Finding ${props.serverName}`}
      message="Looking for it on this Wi-Fi. This can take a few seconds."
      actions={[{ label: 'Cancel', role: 'cancel', onPress: props.onAction }]}
    />
  );
}
