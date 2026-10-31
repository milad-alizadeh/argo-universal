import { z } from 'zod';

// A Server announces itself as `_argo._tcp` while Local network access is on (ADR-0045). The type is declared in the App's iOS config too.
export const discoveryServiceType = 'argo';

export const discoveryProtocol = 'tcp';

// The announcement's TXT field holding the Server's static public key: the one thing that survives a rename, a new router and a new address.
export const discoveryKeyField = 'key';

// What an App sees of a Server on the local network. Unauthenticated: the handshake, not this record, proves who answers.
export const DiscoveredServer = z.strictObject({
  // The computer's name when it announced itself.
  name: z.string(),
  key: z.string(),
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

const Txt = z.looseObject({ [discoveryKeyField]: z.coerce.string() });

const keyOf = (found: Announced): string => {
  const parsed = Txt.safeParse(found.txt);

  return parsed.success ? (parsed.data[discoveryKeyField] ?? '') : '';
};

// An announcement worth listing: it names a key and parses as a `DiscoveredServer`. IPv6 is left out.
export function toDiscoveredServer(
  found: Announced,
): DiscoveredServer | undefined {
  const parsed = DiscoveredServer.safeParse({
    name: found.name,
    key: keyOf(found),
    addresses: found.addresses.filter((address) => ipv4.test(address)),
    port: found.port,
  });

  return parsed.success && parsed.data.key ? parsed.data : undefined;
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
