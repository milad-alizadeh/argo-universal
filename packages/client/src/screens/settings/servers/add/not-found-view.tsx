import { Button } from '@repo/kit/primitives/actions/button';
import { PinnedFooter } from '@repo/kit/primitives/scaffolds/pinned-footer';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type * as React from 'react';
import { useState } from 'react';
import { AddressField } from './type-code-address';

export interface NotFoundViewProps {
  // The discovery name the code carried.
  serverName: string;
  // Tries the Server again, at the address the owner typed when they typed one.
  onTryAgain: (address: string) => void;
  onScanAgain: () => void;
}

const hint =
  'As address:port, or a link such as http://studio.tailnet.ts.net:4000. The other computer shows it next to the code.';

/*
 * A Server the network did not announce (card 3A of Pairing gaps): the page says so and takes the address the other computer shows, since typing it is the way to a Server that is on a network that does not announce. "Try again" knocks at that address; "Scan again" returns to the camera.
 */
export function NotFoundView(props: NotFoundViewProps): React.JSX.Element {
  const [address, setAddress] = useState('');

  return (
    <Screen title="Add a Server">
      <PinnedFooter footer={actionsOf(props, address)}>
        <EmptyState
          icon="computer"
          title={`Can’t find ${props.serverName}`}
          description="It may be asleep, or this phone may be on a different Wi-Fi. If you know its address, type it."
        />
        <AddressField value={address} hint={hint} onChangeText={setAddress} />
      </PinnedFooter>
    </Screen>
  );
}

const actionsOf = (
  props: NotFoundViewProps,
  address: string,
): React.JSX.Element => (
  <>
    <Button
      label="Try again"
      fullWidth
      onPress={() => props.onTryAgain(address)}
    />
    {scanAgain(props)}
  </>
);

const scanAgain = (props: NotFoundViewProps): React.JSX.Element => (
  <Button
    label="Scan again"
    variant="text"
    fullWidth
    onPress={props.onScanAgain}
  />
);
