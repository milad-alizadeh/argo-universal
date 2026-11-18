import type { PageAddress } from '@repo/contracts/plugins/page-address';

// The Page addresses whose last draw read an entry, each with the revision it read; the oldest go past this many.
const keptHolders = 64;

type Held = { address: PageAddress; revision: number };

// A draw still reading holds no revision yet, so the answer it is waiting for never marks it.
export const reading = Number.POSITIVE_INFINITY;

// The Page addresses holding one Query entry, so an answer that changes marks the ones that drew the last.
export class QueryHolders {
  private readonly held = new Map<string, Held>();

  public hold(address: PageAddress | undefined, revision: number): void {
    if (!address) return;
    const key = JSON.stringify(address);

    this.held.delete(key);
    this.held.set(key, { address, revision });
    this.cap();
  }

  // Whether the address drew this entry before, so the App already has a tree for it.
  public has(address: PageAddress | undefined): boolean {
    return address !== undefined && this.held.has(JSON.stringify(address));
  }

  // The addresses holding the entry, by the key their draws are known by.
  public get keys(): IteratorObject<string> {
    return this.held.keys();
  }

  // Whether any address holds the entry.
  public get any(): boolean {
    return this.held.size > 0;
  }

  // The addresses that drew an answer older than `revision`.
  public before(revision: number): PageAddress[] {
    return this.held
      .values()
      .filter((held) => held.revision < revision)
      .map(({ address }) => address)
      .toArray();
  }

  public clear(): void {
    this.held.clear();
  }

  private cap(): void {
    for (const key of this.held.keys()) {
      if (this.held.size <= keptHolders) return;
      this.held.delete(key);
    }
  }
}
