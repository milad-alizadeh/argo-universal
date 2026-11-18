import type { PairingInvite } from '@repo/contracts';
import type { ServerAddress } from '#features/connection';

const urlPattern = /^https?:\/\/(\[[^\]]+\]|[^/:]+):(\d+)/;

const addressOfParts = ([, host = '', port = '']: string[]): ServerAddress => ({
  host: host.replaceAll(/^\[|\]$/g, ''),
  port: Number(port),
});

export function addressOfUrl(url: string): ServerAddress[] {
  const parts = urlPattern.exec(url);

  return parts ? [addressOfParts(parts)] : [];
}

export const addressKey = ({ host, port }: ServerAddress): string =>
  `${host}:${port}`;

const withoutDuplicates = (
  addresses: readonly ServerAddress[],
): ServerAddress[] => [
  ...new Map(
    addresses.map((address) => [addressKey(address), address]),
  ).values(),
];

const qrAddresses = (invite: PairingInvite): ServerAddress[] =>
  (invite.urls ?? []).flatMap(addressOfUrl);

export const addressesToKnockOn = (
  invite: PairingInvite,
  typedAddress: ServerAddress | undefined,
): ServerAddress[] =>
  withoutDuplicates([
    ...qrAddresses(invite),
    ...(typedAddress ? [typedAddress] : []),
  ]);

export const otherQrAddresses = (
  invite: PairingInvite,
  answered: ServerAddress,
): ServerAddress[] =>
  withoutDuplicates(
    qrAddresses(invite).filter(
      (address) => addressKey(address) !== addressKey(answered),
    ),
  );
