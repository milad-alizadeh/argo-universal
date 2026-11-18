import { interfaceAddresses } from './advertiser';

// A home or office network's own addresses, which a phone beside the computer is most likely on.
const privateNetwork = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

// A link-local address answers only while a cable joins the two Devices, so it is said last.
const linkLocal = (host: string): boolean => host.startsWith('169.254.');

const rankOf = (host: string): number => {
  if (privateNetwork.test(host)) return 0;

  return linkLocal(host) ? 2 : 1;
};

const likeliestFirst = (hosts: readonly string[]): string[] =>
  hosts.toSorted((one, other) => rankOf(one) - rankOf(other));

/*
 * Where this computer answers on each of its networks, as `host:port`, the likeliest first: what the QR carries and what an owner types on a Device that cannot find it by itself.
 * A home network comes first, then others such as a tailnet, and a link-local address last.
 */
export const listeningAddresses = (
  port: number,
  hosts: readonly string[] = interfaceAddresses(),
): string[] => likeliestFirst(hosts).map((host) => `${host}:${port}`);
