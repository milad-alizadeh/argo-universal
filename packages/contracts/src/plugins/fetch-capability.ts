import { z } from 'zod';

const ipv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

// Hosts that reach this Mac or anywhere at all; each needs a `reason` the consent screen shows.
const specialHostnames: ((name: string) => boolean)[] = [
  (name) => name === '*' || name === 'localhost',
  (name) => name.startsWith('['),
  (name) => ipv4.test(name),
  (name) => name.endsWith('.localhost'),
];

export const isSpecialHost = (host: string): boolean =>
  specialHostnames.some((special) => special(hostnameOf(host)));

const hostnameOf = (host: string): string =>
  host.startsWith('[')
    ? host.slice(0, host.indexOf(']') + 1)
    : (host.split(':').at(0) ?? host);

const normalUrl = z.url({ normalize: true });

const parsesTo = (host: string): boolean =>
  normalUrl.safeParse(`https://${host}/`).data === `https://${host}/`;

// A host is written as the URL parser normalises it, so what is declared is exactly what a call is compared with.
const normalHost = (host: string): boolean =>
  host === '*' || (parsesTo(host) && !/[/@?#*]/.test(host));

const dnsLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function subdomainSuffix(host: string): boolean {
  const [wildcard, ...labels] = host.split('.');

  if (wildcard !== '*' || labels.length < 2) return false;

  return validDnsSuffix(labels);
}

function validDnsSuffix(labels: string[]): boolean {
  const suffix = labels.join('.');

  return (
    labels.every((label) => dnsLabel.test(label)) &&
    parsesTo(suffix) &&
    !isSpecialHost(suffix)
  );
}

// Patterns match a single DNS label on the default HTTPS port.
export function matchesSubdomain(pattern: string, host: string): boolean {
  const dot = host.indexOf('.');

  return (
    pattern.startsWith('*.') &&
    dnsLabel.test(host.slice(0, dot)) &&
    host.slice(dot) === pattern.slice(1)
  );
}

export const AccountHost = z
  .string()
  .refine(
    (host) => normalHost(host) && !isAccountLoopback(host),
    'Account host must be concrete, with no wildcard or localhost forms',
  );

const accountLocalNames = new Set([
  '*',
  'localhost',
  '0.0.0.0',
  '[::]',
  '[::1]',
]);

function isAccountLoopback(host: string): boolean {
  const name = hostnameOf(host).replace(/\.$/, '');

  return accountLocalNames.has(name) || localAccountSuffix(name);
}

const localAccountSuffix = (name: string): boolean =>
  name.endsWith('.localhost') || loopbackAddress(name);

const loopbackAddress = (name: string): boolean =>
  /^127\.\d+\.\d+\.\d+$/.test(name) ||
  /^\[::ffff:7f[\da-f]{2}:[\da-f]{1,4}\]$/.test(name);

// Only concrete hosts have an exact match; the port is part of the identity.
export const sameHost = (left: string, right: string): boolean =>
  left === right && !left.includes('*');

// The host a failing capability names, for its message.
const HostOf = z.object({ host: z.string() }).catch({ host: 'This host' });

export const FetchCapability = z
  .strictObject({
    kind: z.literal('fetch'),
    host: z
      .string()
      .refine((host) => normalHost(host) || subdomainSuffix(host), {
        error:
          'host must be a lower-case host name, a single-label subdomain pattern such as *.example.com, or *',
      }),
    reason: z.string().trim().min(1).optional(),
  })
  .refine(
    (capability) => capability.reason || !isSpecialHost(capability.host),
    {
      error: ({ input }) => `${HostOf.parse(input).host} needs a reason`,
    },
  );

export type FetchCapability = z.infer<typeof FetchCapability>;
