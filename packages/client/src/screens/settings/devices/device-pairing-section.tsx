import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import type { DeviceListViewProps } from './device-list-view';

const pairingReasons = {
  off: 'Pairing is unavailable while Local network access is off. Turn it on above to pair a Device.',
  browser:
    'Pairing is unavailable in a browser, which has no secure place for a Device Key. Pair from the desktop app instead.',
  on: 'Show a code on this computer and scan it with Argo on the other Device.',
};

/*
 * Pairing a Device, and the one place it is offered (ADR-0045): the computer's own Devices page, never a phone, which cannot show a code to scan. The row says why it cannot be used rather than disappearing: a switch that hides its consequence teaches nothing.
 * The sheet behind it is what mints a Pairing Ticket, so a code only ever exists while the owner is looking at one.
 */
export function pairingSection(
  props: DeviceListViewProps,
): React.JSX.Element | null {
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
    <FieldGroup.Link
      title="Pair a Device"
      leading={{ sf: 'qrcode', material: 'qr_code' }}
      action
      disabled={reason !== 'on'}
      onPress={() => props.onPairDevice?.()}
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
