import type { PairingInvite } from '@repo/contracts';
import type { ServerAddress } from '#features/connection';

// `http://host:port`, with an IPv6 host in brackets; anything else in the code is not somewhere to knock.
const urlPattern = /^https?:\/\/(\[[^\]]+\]|[^/:]+):(\d+)/;

const addressOfParts = ([, host = '', port = '']: string[]): ServerAddress => ({
  host: host.replaceAll(/^\[|\]$/g, ''),
  port: Number(port),
});

function addressOfUrl(url: string): ServerAddress[] {
  const parts = urlPattern.exec(url);

  return parts ? [addressOfParts(parts)] : [];
}

export const keyOf = ({ host, port }: ServerAddress): string =>
  `${host}:${port}`;

export const unique = (
  addresses: readonly ServerAddress[],
): ServerAddress[] => [
  ...new Map(addresses.map((address) => [keyOf(address), address])).values(),
];

// Where the code says the Server answers, then where the owner said it is: knocked on first, before anything is asked of the network.
export const directAddresses = (
  invite: PairingInvite,
  address: ServerAddress | undefined,
): ServerAddress[] =>
  unique([
    ...(invite.urls ?? []).flatMap(addressOfUrl),
    ...(address ? [address] : []),
  ]);

// Every address the code carries but the one that answered, to be kept so the Server can be reached later from another network.
export const otherAddressesOf = (
  invite: PairingInvite,
  answered: ServerAddress,
): ServerAddress[] =>
  unique(
    (invite.urls ?? [])
      .flatMap(addressOfUrl)
      .filter((address) => keyOf(address) !== keyOf(answered)),
  );
