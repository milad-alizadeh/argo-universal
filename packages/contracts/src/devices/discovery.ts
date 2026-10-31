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
