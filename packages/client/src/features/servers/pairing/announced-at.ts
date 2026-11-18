import type { PairingInvite } from '@repo/contracts';
import type { ServerAddress } from '#features/connection';
import { firstBrowseTimeoutMs } from './browse-timing';
import type { PairDeps } from './pair-with-invite';
import { addressKey } from './qr-addresses';

export type Announced =
  | { heard: true; name: string; addresses: ServerAddress[] }
  | { heard: false };

type Located = Awaited<ReturnType<PairDeps['resolve']>>;

function notYetKnockedOn(
  located: Located,
  alreadyKnockedOn: readonly ServerAddress[],
): ServerAddress[] {
  const skip = new Set(alreadyKnockedOn.map(addressKey));

  return located.hosts
    .map((host) => ({ host, port: located.port }))
    .filter((address) => !skip.has(addressKey(address)));
}

const heardAt = (
  located: Located,
  alreadyKnockedOn: readonly ServerAddress[],
): Announced => ({
  heard: true,
  name: located.name,
  addresses: notYetKnockedOn(located, alreadyKnockedOn),
});

export async function announcedAt(
  { invite, deps }: { invite: PairingInvite; deps: PairDeps },
  alreadyKnockedOn: readonly ServerAddress[],
): Promise<Announced> {
  const known = { name: invite.server, key: invite.key };
  const timeoutMs = deps.firstBrowse ? firstBrowseTimeoutMs : undefined;

  try {
    const located = await deps.resolve(known, deps.browse, timeoutMs);

    return heardAt(located, alreadyKnockedOn);
  } catch {
    return { heard: false };
  }
}
