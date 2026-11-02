import { productName } from '@repo/contracts/product-identity';
import { Alert, type AlertAction } from '@repo/kit/primitives/overlays/alert';
import type * as React from 'react';
import { useState } from 'react';
import type { StopServerSetting } from './connection-controls';

const actions = (onStop: () => void): AlertAction[] => [
  { label: 'Cancel', role: 'cancel' },
  { label: 'Stop Server', tone: 'danger', onPress: onStop },
];

// Asks first: stopping ends every paired Device's Sessions, and only opening Argo again starts the Server.
export const StopServerAlert = (props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStop: () => void;
}): React.JSX.Element => (
  <Alert
    open={props.open}
    onOpenChange={props.onOpenChange}
    title="Stop the Server?"
    message={`Paired Devices lose their Sessions, and anything running on them stops. ${productName} starts the Server again the next time you open it.`}
    actions={actions(props.onStop)}
  />
);

// The question and the press that opens it; with no way to stop there is neither.
export function useStopAsk(
  setting?: StopServerSetting,
): readonly [(() => void) | undefined, React.JSX.Element | null] {
  const [open, onOpenChange] = useState(false);

  if (!setting) return [undefined, null];

  const alert = (
    <StopServerAlert
      open={open}
      onOpenChange={onOpenChange}
      onStop={setting.onStop}
    />
  );

  return [() => onOpenChange(true), alert];
}
