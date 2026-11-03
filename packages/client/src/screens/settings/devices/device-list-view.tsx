import { productName } from '@repo/contracts/product-identity';
import { Action } from '@repo/kit/primitives/actions/action';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { useState } from 'react';
import {
  FieldList,
  type FieldListSection,
} from '#lib/product/field-list/field-list';
import { noOtherDevices, pairingOff } from './device-list-panels';
import { deviceRow } from './device-list-rows';
import type { DeviceRow } from './device-rows';
import { DeviceUnpairAlert } from './device-unpair-alert';

export interface DeviceListViewProps {
  // This computer first, then each Paired Device; absent until the Server has answered.
  devices?: readonly DeviceRow[];
  // Whether Local network access is on, which Pairing needs; absent until the Server has said.
  accessEnabled?: boolean;
  // Whether this App can hold a Device Key at all; a browser tab cannot, so it is never offered Pairing (ADR-0045).
  pairingOffered?: boolean;
  // The pair sheet itself, which mints a Pairing Ticket of its own; the header button opens it.
  pairDeviceSheet?: React.ReactNode;
  onPairDevice?: () => void;
  onUnpairDevice: (id: string) => void;
  onGoToConnection?: () => void;
  onBack?: () => void;
}

const footer =
  'Paired Devices can see your Projects and Sessions. Only this computer can pair or unpair Devices.';

const canPair = (props: DeviceListViewProps): boolean =>
  props.accessEnabled === true && props.pairingOffered !== false;

export function DeviceListView(props: DeviceListViewProps): React.JSX.Element {
  return (
    <Screen
      title="Devices"
      caption={`Devices that can use ${productName} on this computer`}
      {...pairAction(props)}
      onBack={props.onBack}
    >
      <DevicesBody {...props} />
    </Screen>
  );
}

// Which Paired Device the owner is being asked about, if any; the question is the list's, not each row's.
function DevicesBody(props: DeviceListViewProps): React.JSX.Element {
  const [asked, ask] = useState<DeviceRow | null>(null);

  return (
    <>
      <FieldList sections={sections(props, ask)} />
      {canPair(props) ? props.pairDeviceSheet : null}
      <UnpairAsk
        device={asked}
        onClose={() => ask(null)}
        onUnpair={props.onUnpairDevice}
      />
    </>
  );
}

// A browser tab cannot hold a Device Key, so it is offered no way to pair at all.
const pairAction = (
  props: DeviceListViewProps,
): { primaryAction?: React.ReactElement } =>
  props.pairingOffered === false ? {} : { primaryAction: pairButton(props) };

const pairButton = (props: DeviceListViewProps): React.JSX.Element => (
  <Action
    label="Pair a Device"
    icon={{ sf: 'qrcode', material: 'qr_code' }}
    disabled={!canPair(props)}
    onPress={() => props.onPairDevice?.()}
  />
);

function sections(
  props: DeviceListViewProps,
  ask: (device: DeviceRow) => void,
): FieldListSection[] {
  if (!props.devices) return [];

  const others = props.devices.some((device) => !device.serverDevice);

  return [
    {
      rows: props.devices.map((device) => deviceRow(device, ask)),
      footer: others ? footer : undefined,
    },
    ...below(props, others),
  ];
}

// With no Paired Device the page says why, and where to go when Pairing is off.
function below(
  props: DeviceListViewProps,
  others: boolean,
): FieldListSection[] {
  if (others) return [];

  return [panel(props.accessEnabled === false ? off(props) : noOtherDevices())];
}

const off = (props: DeviceListViewProps): React.ReactElement =>
  pairingOff(props.onGoToConnection);

const panel = (row: React.ReactElement): FieldListSection => ({
  plain: true,
  rows: [row],
});

interface UnpairAskProps {
  device: DeviceRow | null;
  onClose: () => void;
  onUnpair: (id: string) => void;
}

function UnpairAsk(props: UnpairAskProps): React.JSX.Element | null {
  const { device } = props;

  if (!device) return null;

  return (
    <DeviceUnpairAlert
      open
      onOpenChange={props.onClose}
      name={device.name}
      onUnpair={() => props.onUnpair(device.id)}
    />
  );
}
