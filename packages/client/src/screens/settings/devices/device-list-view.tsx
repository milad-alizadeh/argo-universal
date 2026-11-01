import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { pairingSection } from './device-pairing-section';
import { type DeviceRow, platformName } from './device-rows';

export type LocalNetworkAccessLoad =
  | { status: 'loading' | 'error' | 'disconnected' }
  | { status: 'loaded'; enabled: boolean };

export interface DeviceListViewProps {
  localNetworkAccess: LocalNetworkAccessLoad;
  saving?: boolean;
  error?: string;
  // This computer first, then each Paired Device; absent until the Server has answered.
  devices?: readonly DeviceRow[];
  onOpenDevice?: (id: string) => void;
  // Whether this App can hold a Device Key at all; a browser tab cannot, so it is never offered Pairing (ADR-0045).
  pairingOffered?: boolean;
  // The pair sheet itself, which mints a Pairing Ticket of its own; the row above opens it.
  pairDeviceSheet?: React.ReactNode;
  onLocalNetworkAccessChange: (enabled: boolean) => void;
  onPairDevice?: () => void;
  onRetry: () => void;
  onBack?: () => void;
}

const footers = {
  off: 'Only this computer can reach the Server. Turn this on to let other Devices on your network reach it, which Pairing needs.',
  on: 'Other Devices on your network can reach the Server. Turn this off and only this computer can.',
};

const messages = {
  loading: 'Loading Local network access…',
  error: 'Could not load Local network access.',
  disconnected: 'Connect to the Server to change Local network access.',
};

export function DeviceListView(props: DeviceListViewProps): React.JSX.Element {
  return (
    <SizeClass
      compact={<DevicesScreen {...props} wide={false} />}
      wide={<DevicesScreen {...props} wide />}
    />
  );
}

function DevicesScreen(
  props: DeviceListViewProps & { wide: boolean },
): React.JSX.Element {
  return (
    <Screen title="Devices" onBack={props.onBack}>
      <FieldGroup>
        {accessSection(props)}
        {devicesSection(props)}
        {props.wide ? pairingSection(props) : null}
        {statusSection(props)}
      </FieldGroup>
    </Screen>
  );
}

// Until the Server has answered, the view claims neither state: the switch and the Pairing row wait, and the message below says why.
function accessSection(props: DeviceListViewProps): React.JSX.Element | null {
  const access = props.localNetworkAccess;

  if (access.status !== 'loaded') return null;

  return (
    <FieldGroup.Section footer={access.enabled ? footers.on : footers.off}>
      <FieldGroup.Toggle
        title="Local network access"
        value={access.enabled}
        disabled={props.saving}
        onValueChange={props.onLocalNetworkAccessChange}
      />
    </FieldGroup.Section>
  );
}

const deviceFooter =
  'Paired Devices can see your Projects and Sessions. Only this computer can pair or unpair Devices.';

// This computer is marked and has no way in to an unpair; each Paired Device opens its own page, where the red row is.
function devicesSection(props: DeviceListViewProps): React.JSX.Element | null {
  if (!props.devices) return null;

  return (
    <FieldGroup.Section title="Devices" footer={deviceFooter}>
      {props.devices.map((device) => deviceRow(device, props.onOpenDevice))}
    </FieldGroup.Section>
  );
}

const deviceRow = (
  device: DeviceRow,
  onOpen?: (id: string) => void,
): React.JSX.Element =>
  device.serverDevice ? thisComputer(device) : pairedDevice(device, onOpen);

const thisComputer = (device: DeviceRow): React.JSX.Element => (
  <FieldGroup.Value
    key={device.id}
    title={device.name}
    value="This computer"
    leading={leadingFor(device)}
  />
);

const pairedDevice = (
  device: DeviceRow,
  onOpen?: (id: string) => void,
): React.JSX.Element => (
  <FieldGroup.Link
    key={device.id}
    title={device.name}
    value={`${platformName(device.platform)} · ${device.seen}`}
    leading={leadingFor(device)}
    onPress={() => onOpen?.(device.id)}
  />
);

type Leading = React.ComponentProps<typeof FieldGroup.Value>['leading'];

// A phone-class Device draws the phone glyph, any other the computer's; the Server says only the platform, so no tablet.
const leadingFor = (device: DeviceRow): Leading =>
  device.platform === 'ios' || device.platform === 'android'
    ? 'phone'
    : 'computer';

function statusSection(props: DeviceListViewProps): React.JSX.Element | null {
  const access = props.localNetworkAccess;
  const message = props.error ?? unloadedMessage(access);

  if (!message) return null;

  return (
    <FieldGroup.Section footer={message}>
      {retryButton(access.status, props.onRetry)}
    </FieldGroup.Section>
  );
}

const retryButton = (
  status: LocalNetworkAccessLoad['status'],
  onRetry: () => void,
): React.JSX.Element | null =>
  status === 'error' ? (
    <Button label="Retry" variant="text" onPress={onRetry} />
  ) : null;

const unloadedMessage = (access: LocalNetworkAccessLoad): string | undefined =>
  access.status === 'loaded' ? undefined : messages[access.status];
