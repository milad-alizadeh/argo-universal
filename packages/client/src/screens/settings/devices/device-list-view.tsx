import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';

export type LocalNetworkAccessLoad =
  | { status: 'loading' | 'error' | 'disconnected' }
  | { status: 'loaded'; enabled: boolean };

export interface DeviceListViewProps {
  caption?: string;
  localNetworkAccess: LocalNetworkAccessLoad;
  saving?: boolean;
  error?: string;
  onLocalNetworkAccessChange: (enabled: boolean) => void;
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

const pairingReason =
  'Pairing is unavailable while Local network access is off. Turn it on above to pair a Device.';

export function DeviceListView(props: DeviceListViewProps): React.JSX.Element {
  return (
    <Screen title="Devices" caption={props.caption} onBack={props.onBack}>
      <FieldGroup>
        {accessSection(props)}
        {pairingSection(props.localNetworkAccess)}
        {statusSection(props)}
      </FieldGroup>
    </Screen>
  );
}

const isOn = (access: LocalNetworkAccessLoad): boolean =>
  access.status === 'loaded' && access.enabled;

function accessSection(props: DeviceListViewProps): React.JSX.Element {
  const access = props.localNetworkAccess;

  return (
    <FieldGroup.Section footer={isOn(access) ? footers.on : footers.off}>
      <FieldGroup.Toggle
        title="Local network access"
        value={isOn(access)}
        disabled={access.status !== 'loaded' || props.saving}
        onValueChange={props.onLocalNetworkAccessChange}
      />
    </FieldGroup.Section>
  );
}

// Pairing itself is built after this switch (Spec 0025); until the switch is on, the row says why it cannot be used.
function pairingSection(
  access: LocalNetworkAccessLoad,
): React.JSX.Element | null {
  if (isOn(access)) return null;

  return (
    <FieldGroup.Section footer={pairingReason}>
      <Button label="Pair a Device" variant="text" disabled />
    </FieldGroup.Section>
  );
}

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
