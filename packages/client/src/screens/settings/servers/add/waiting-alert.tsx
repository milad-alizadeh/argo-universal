import { Alert } from '@repo/kit/primitives/overlays/alert';
import type * as React from 'react';

export interface WaitingAlertProps {
  serverName: string;
  onAction: () => void;
}

// The wait ends by an answer, never by closing the card.
function stays(): void {
  /* nothing closes it but the answer */
}

/*
 * The wait for the owner's answer (#1490 card 8, option A): a card over the scanner, not a page of its own, so the camera the code was read with is still there behind it. Its one answer is Cancel.
 */
export function WaitingAlert(props: WaitingAlertProps): React.JSX.Element {
  return (
    <Alert
      open
      busy
      onOpenChange={stays}
      title="Waiting for approval"
      message={`On ${props.serverName}, press Allow on “Allow this Device?”`}
      actions={[{ label: 'Cancel', role: 'cancel', onPress: props.onAction }]}
    />
  );
}
