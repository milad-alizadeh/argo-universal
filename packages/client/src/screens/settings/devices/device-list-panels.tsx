import { Button } from '@repo/kit/primitives/actions/button';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type * as React from 'react';

export const noOtherDevices = (): React.JSX.Element => (
  <EmptyState
    key="none"
    title="No other Devices yet"
    description="Pair a phone or another computer to follow your Sessions from there. It only takes a code."
  />
);

const goButton = (onPress?: () => void): React.JSX.Element => (
  <Button
    label="Go to Connection"
    variant="secondary"
    size="sm"
    onPress={() => onPress?.()}
  />
);

// Pairing needs Local network access, which lives on the Connection page.
export const pairingOff = (
  onGoToConnection?: () => void,
): React.JSX.Element => (
  <EmptyState
    key="off"
    title="Pairing is off"
    description="Other Devices can’t reach this computer yet. Turn on Local network access to pair a phone or another computer."
    action={goButton(onGoToConnection)}
  />
);
