import type { DiscoveredServer } from '@repo/contracts';
import type { BrowseServers } from '#features/connection';

type Servers = readonly DiscoveredServer[];

export interface Timing {
  timeoutMs: number;
  settleMs: number;
}

// What has been heard so far, and when to stop listening: shortly after the first Server speaks, so the others announcing together are heard too.
class Hearing {
  public readonly done = Promise.withResolvers<Servers>();
  private latest: Servers = [];
  private settling: ReturnType<typeof setTimeout> | undefined;
  private readonly giveUp: ReturnType<typeof setTimeout>;

  public constructor(private readonly timing: Timing) {
    this.giveUp = setTimeout(() => this.finish(), timing.timeoutMs);
  }

  public hear(servers: Servers): void {
    this.latest = servers;
    this.stopSettling();

    if (servers.length > 0)
      this.settling = setTimeout(() => this.finish(), this.timing.settleMs);
  }

  public finish(): void {
    this.stopSettling();
    clearTimeout(this.giveUp);
    this.done.resolve(this.latest);
  }

  private stopSettling(): void {
    clearTimeout(this.settling);
  }
}

const nothingToStop = (): void => {};

// A browser that cannot start (a native module that is not linked) hears nothing, which ends the wait at once.
function startBrowsing(browse: BrowseServers, hearing: Hearing): () => void {
  try {
    return browse((servers) => hearing.hear(servers));
  } catch {
    hearing.finish();

    return nothingToStop;
  }
}

/*
 * The Servers announced on the network: once one has been heard and no more are arriving together, or none if nothing announces itself in time. Where nothing can listen there is nothing to wait for.
 */
export async function heardServers(
  browse: BrowseServers | null,
  timing: Timing,
): Promise<Servers> {
  if (!browse) return [];

  const hearing = new Hearing(timing);
  const stop = startBrowsing(browse, hearing);

  try {
    return await hearing.done.promise;
  } finally {
    hearing.finish();
    stop();
  }
}
