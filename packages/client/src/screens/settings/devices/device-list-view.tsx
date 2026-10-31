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

const pairingReasons = {
  off: 'Pairing is unavailable while Local network access is off. Turn it on above to pair a Device.',
  browser:
    'Pairing is unavailable in a browser, which has no secure place for a Device Key. Pair from the desktop app instead.',
  on: 'Show a code on this computer and scan it with Argo on the other Device.',
};

export function DeviceListView(props: DeviceListViewProps): React.JSX.Element {
  return (
    <Screen title="Devices" caption={props.caption} onBack={props.onBack}>
      <FieldGroup>
        {accessSection(props)}
        {pairingSection(props)}
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

/*
 * Pairing a Device, and the one place it is offered (ADR-0045). The row says why it cannot be used rather than disappearing: a switch that hides its consequence teaches nothing.
 * The sheet behind it is what mints a Pairing Ticket, so a code only ever exists while the owner is looking at one.
 */
function pairingSection(props: DeviceListViewProps): React.JSX.Element | null {
  const access = props.localNetworkAccess;

  if (access.status !== 'loaded') return null;

  return pairingRow(props, pairingReasonFor(props, access.enabled));
}

type PairingReason = keyof typeof pairingReasons;

const pairingRow = (
  props: DeviceListViewProps,
  reason: PairingReason,
): React.JSX.Element => (
  <FieldGroup.Section footer={pairingReasons[reason]}>
    <Button
      label="Pair a Device"
      variant="text"
      disabled={reason !== 'on'}
      onPress={props.onPairDevice}
    />
    {reason === 'on' ? props.pairDeviceSheet : null}
  </FieldGroup.Section>
);

const pairingReasonFor = (
  props: DeviceListViewProps,
  enabled: boolean,
): PairingReason => {
  if (props.pairingOffered === false) return 'browser';

  return enabled ? 'on' : 'off';
};

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
