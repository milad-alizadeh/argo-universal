import { z } from 'zod';
import { sha256 } from './sha256';

// A Server announces itself as `_argo._tcp` while Local network access is on (ADR-0045). The type is declared in the App's iOS config too.
export const discoveryServiceType = 'argo';

export const discoveryProtocol = 'tcp';

// The announcement's TXT field holding the hash of the Server's static public key: what survives a rename, a new router and a new address. The key itself is never announced; it reaches an App out of band (ADR-0045).
export const discoveryKeyHashField = 'keyhash';

const keyHashBytes = 16;

/*
 * What an announcement carries in place of the Server's static public key: the first 16 bytes of its SHA-256, base64url.
 * Both sides call this, so they cannot disagree. A matching hint only: the handshake, not this, proves who answers.
 */
export function keyHashOf(publicKey: string): string {
  const digest = sha256(new TextEncoder().encode(publicKey));

  return btoa(String.fromCharCode(...digest.subarray(0, keyHashBytes)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

// What an App sees of a Server on the local network. Unauthenticated: the handshake, not this record, proves who answers.
export const DiscoveredServer = z.strictObject({
  // The computer's name when it announced itself.
  name: z.string(),
  keyHash: z.string(),
  addresses: z.array(z.string()),
  port: z.int(),
});

export type DiscoveredServer = z.infer<typeof DiscoveredServer>;

// What a platform's mDNS browser hands over about one announcement. The peer is unauthenticated: every field is untrusted.
export interface Announced {
  name: string;
  txt: unknown;
  addresses: string[];
  port: number;
}

const ipv4 = /^\d+\.\d+\.\d+\.\d+$/;

const Txt = z.looseObject({ [discoveryKeyHashField]: z.coerce.string() });

const keyHashIn = (found: Announced): string => {
  const parsed = Txt.safeParse(found.txt);

  return parsed.success ? (parsed.data[discoveryKeyHashField] ?? '') : '';
};

// An announcement worth listing: it carries a key hash and parses as a `DiscoveredServer`. IPv6 is left out.
export function toDiscoveredServer(
  found: Announced,
): DiscoveredServer | undefined {
  const parsed = DiscoveredServer.safeParse({
    name: found.name,
    keyHash: keyHashIn(found),
    addresses: found.addresses.filter((address) => ipv4.test(address)),
    port: found.port,
  });

  return parsed.success && parsed.data.keyHash ? parsed.data : undefined;
}

// Every Argo Server heard so far, by whatever identifies an announcement to the platform; one that is removed is dropped. Each change reports the whole list.
export class HeardServers {
  private readonly servers = new Map<string, DiscoveredServer>();

  public constructor(
    private readonly listener: (servers: readonly DiscoveredServer[]) => void,
  ) {}

  public up(id: string, found: Announced): void {
    const server = toDiscoveredServer(found);

    if (server) this.servers.set(id, server);
    this.listener([...this.servers.values()]);
  }

  public down(id: string): void {
    this.servers.delete(id);
    this.listener([...this.servers.values()]);
  }
}
