import type { LookupAddress, LookupOptions } from 'node:dns';
import { BlockList, isIP, isIPv4, type LookupFunction } from 'node:net';
import { CapabilityRefusal } from './capability-refusal';
import type { HostRule } from './plugin-access';
import privateRanges from './private-addresses.json' with { type: 'json' };

type LookupCallback = Parameters<LookupFunction>[2];

// Loopback, private, link-local, shared, multicast and reserved ranges, IPv4 and IPv6 (ADR-0030).
function blockList(): BlockList {
  const list = new BlockList();

  for (const { address, prefix } of privateRanges.ipv4)
    list.addSubnet(address, prefix, 'ipv4');

  for (const { address, prefix } of privateRanges.ipv6)
    list.addSubnet(address, prefix, 'ipv6');

  return list;
}

const privateAddresses = blockList();

const isPrivateAddress = (address: string): boolean =>
  isIP(address) !== 0 &&
  privateAddresses.check(address, isIPv4(address) ? 'ipv4' : 'ipv6');

// A raw address is connected without a lookup, so it is checked here.
export function allowLiteral(url: URL, rule: HostRule): void {
  const host = url.hostname.replaceAll(/^\[|\]$/g, '');

  if (!rule.private && isPrivateAddress(host))
    throw new CapabilityRefusal(`${url.host} is a private address`);
}

// Checks every address a name resolves to as the socket connects, so DNS rebinding gains nothing.
export function checkedLookup(
  rule: HostRule,
  lookup: LookupFunction,
): LookupFunction {
  return (hostname, options, callback) => {
    lookup(hostname, { ...options, all: true }, (error, found, family) => {
      if (error) return callback(error, '', 0);

      screen({ rule, hostname, options, callback }, addressList(found, family));
    });
  };
}

// One lookup the socket asked for, and the rule its addresses are held to.
type Asked = {
  rule: HostRule;
  hostname: string;
  options: LookupOptions;
  callback: LookupCallback;
};

function screen(asked: Asked, addresses: LookupAddress[]): void {
  const refused = refusedAddress(asked.rule, addresses);

  if (!refused) return answer(asked, addresses);

  asked.callback(
    new CapabilityRefusal(
      `${asked.hostname} resolves to private address ${refused.address}`,
    ),
    '',
    0,
  );
}

const addressList = (
  found: string | LookupAddress[],
  family: number | undefined,
): LookupAddress[] =>
  typeof found === 'string' ? [{ address: found, family: family ?? 0 }] : found;

const refusedAddress = (
  rule: HostRule,
  addresses: LookupAddress[],
): LookupAddress | undefined =>
  rule.private
    ? undefined
    : addresses.find(({ address }) => isPrivateAddress(address));

// Answers in the shape the caller asked for: every address, or the first.
function answer(
  { callback, options }: Asked,
  addresses: LookupAddress[],
): void {
  const [first] = addresses;

  if (options.all) return callback(null, addresses);

  if (!first) return callback(new Error('No address found'), '', 0);

  callback(null, first.address, first.family);
}
