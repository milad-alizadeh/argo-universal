import type { PageAddress } from '@repo/contracts/plugins/page-address';

// The most addresses a Plugin is remembered to have drawn; the least recently drawn goes first.
const keptAddresses = 200;

export const addressKey = (address: PageAddress): string =>
  JSON.stringify(address);

type Drawn = { address: PageAddress; hostRead: boolean };

/*
 * The addresses a Plugin drew, and whether the last draw of each read host data directly, such as an Account or
 * its storage, instead of through a Query (ADR-0060). Core compares only what a Query answered, so an address
 * whose draw held no Query, or read the host beside one, is one it cannot tell has changed.
 */
export class DrawnReads {
  private readonly plugins = new Map<string, Map<string, Drawn>>();

  // An address is drawn again: what it read before no longer counts.
  public drew(address: PageAddress): void {
    const drawn = this.drawnOf(address.pluginId);
    const key = addressKey(address);

    drawn.delete(key);
    drawn.set(key, { address, hostRead: false });

    const surplus = Math.max(0, drawn.size - keptAddresses);

    for (const oldest of drawn.keys().take(surplus).toArray())
      drawn.delete(oldest);
  }

  // Whether the Server has drawn any address of the Plugin since it started.
  public knows(pluginId: string): boolean {
    return (this.plugins.get(pluginId)?.size ?? 0) > 0;
  }

  // The draw of this address read host data outside a Query.
  public hostRead(address: PageAddress): void {
    const drawn = this.plugins.get(address.pluginId)?.get(addressKey(address));

    if (drawn) drawn.hostRead = true;
  }

  // The addresses core cannot compare: no Query holds them, or their last draw also read the host.
  public uncomparable(
    pluginId: string,
    held: ReadonlySet<string>,
  ): PageAddress[] {
    return this.drawnOf(pluginId)
      .entries()
      .filter(([key, drawn]) => drawn.hostRead || !held.has(key))
      .map(([, { address }]) => address)
      .toArray();
  }

  public forget(pluginId: string): void {
    this.plugins.delete(pluginId);
  }

  private drawnOf(pluginId: string): Map<string, Drawn> {
    const existing = this.plugins.get(pluginId);

    if (existing) return existing;

    const drawn = new Map<string, Drawn>();

    this.plugins.set(pluginId, drawn);

    return drawn;
  }
}
