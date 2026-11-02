import { Button } from '@repo/kit/primitives/actions/button';
import { Icon } from '@repo/kit/primitives/content/icon';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { Pill } from '@repo/kit/primitives/status/pill';
import type * as React from 'react';
import { platformIcon, platformName } from '#features/settings';
import type { DeviceRow } from './device-rows';

const leadingFor = (device: DeviceRow): React.JSX.Element => (
  <Icon name={platformIcon(device.platform)} />
);

// This computer is marked and has no unpair.
const thisComputer = (device: DeviceRow): React.JSX.Element => (
  <ListItem
    key={device.id}
    title={device.name}
    subtitle={platformName(device.platform)}
    leading={leadingFor(device)}
    trailing={<Pill text="This computer" />}
  />
);

// The red word is the row's own press; the Device is asked about before it goes.
const unpairButton = (
  device: DeviceRow,
  onUnpair: (device: DeviceRow) => void,
): React.JSX.Element => (
  <Button
    label="Unpair"
    variant="danger"
    size="sm"
    accessibilityLabel={`Unpair ${device.name}`}
    onPress={() => onUnpair(device)}
  />
);

const pairedDevice = (
  device: DeviceRow,
  onUnpair: (device: DeviceRow) => void,
): React.JSX.Element => (
  <ListItem
    key={device.id}
    title={device.name}
    subtitle={`${platformName(device.platform)} · ${device.seen}`}
    leading={leadingFor(device)}
    trailingAccessories={unpairButton(device, onUnpair)}
  />
);

export const deviceRow = (
  device: DeviceRow,
  onUnpair: (device: DeviceRow) => void,
): React.JSX.Element =>
  device.serverDevice ? thisComputer(device) : pairedDevice(device, onUnpair);
