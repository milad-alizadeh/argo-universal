import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { oneRow } from '../one-row';
import { unpairCopy, useUnpairAsk } from './device-unpair-alert';

export type DeviceDetailLoad =
  | { status: 'loading' | 'missing' }
  | {
      status: 'loaded';
      name: string;
      platform: string;
      paired: string;
      seen: string;
    };

export interface DeviceDetailViewProps {
  device: DeviceDetailLoad;
  onUnpair: () => void;
  onBack?: () => void;
}

const messages = {
  loading: 'Loading the Device…',
  missing: 'This Server has no such Device. It may have been unpaired.',
};

// One Paired Device, and the red row that unpairs it after asking.
export function DeviceDetailView(
  props: DeviceDetailViewProps,
): React.JSX.Element {
  return (
    <Screen title={titleOf(props.device)} onBack={props.onBack}>
      {props.device.status === 'loaded' ? (
        <LoadedDevice {...props} device={props.device} />
      ) : (
        oneRow(messages[props.device.status])
      )}
    </Screen>
  );
}

const titleOf = (device: DeviceDetailLoad): string =>
  device.status === 'loaded' ? device.name : 'Device';

type Loaded = Extract<DeviceDetailLoad, { status: 'loaded' }>;

type LoadedProps = DeviceDetailViewProps & { device: Loaded };

// FieldGroup finds its sections by element type, so each is an element built here, not a component.
const facts = (device: Loaded): React.JSX.Element => (
  <FieldGroup.Section>
    <FieldGroup.Value title="Platform" value={device.platform} />
    <FieldGroup.Value title="Paired" value={device.paired} />
    <FieldGroup.Value title="Last seen" value={device.seen} />
  </FieldGroup.Section>
);

const unpairSection = (onPress: () => void): React.JSX.Element => (
  <FieldGroup.Section footer="It loses access straight away. Unpairing asks you to confirm first.">
    <Button label={unpairCopy.row} variant="danger" onPress={onPress} />
  </FieldGroup.Section>
);

function LoadedDevice({ device, onUnpair }: LoadedProps): React.JSX.Element {
  const [ask, alert] = useUnpairAsk({ name: device.name, onUnpair });

  return (
    <>
      <FieldGroup>
        {facts(device)}
        {unpairSection(ask)}
      </FieldGroup>
      {alert}
    </>
  );
}
