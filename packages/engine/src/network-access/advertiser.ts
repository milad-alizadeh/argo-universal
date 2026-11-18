import { networkInterfaces } from 'node:os';
import { Announcer, type NetworkWatch, type Report } from './announcer';
import type { LocalNetworkAccess } from './local-network-access';
import type { Announcement } from './service-identity';

export type { Announcement } from './service-identity';

// The address of every network interface this computer is on, one each: a multi-homed Server Device is reached on any of them.
export const interfaceAddresses = (): string[] =>
  Object.values(networkInterfaces())
    .map((addresses) =>
      addresses?.find((entry) => entry.family === 'IPv4' && !entry.internal),
    )
    .flatMap((entry) => (entry ? [entry.address] : []));

const defaultWatch: NetworkWatch = {
  addresses: interfaceAddresses,
  checkEveryMs: 10_000,
};

export interface Announcing {
  report: Report;
  watch?: NetworkWatch;
}

/*
 * Announces the Server over mDNS/Bonjour while Local network access is on, and says goodbye when it goes off (ADR-0045).
 * The switch is the only thing that decides: nothing here turns it on. Answers a function that withdraws the announcement, for the Server's own close.
 */
export function announceWhileLocalNetworkAccessIsOn(
  access: Pick<LocalNetworkAccess, 'enabled' | 'subscribe'>,
  announcement: Announcement,
  { report, watch = defaultWatch }: Announcing,
): () => Promise<void> {
  const announcer = new Announcer(announcement, report, watch);

  const unsubscribe = access.subscribe((enabled): void => {
    void announcer.set(enabled);
  });

  // `subscribe` does not say what the switch is now; both calls are synchronous, so nothing slips between them.
  void announcer.set(access.enabled);

  return async (): Promise<void> => {
    unsubscribe();
    await announcer.set(false);
  };
}
