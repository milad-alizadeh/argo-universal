import type { QueryEntry } from './query-entry';

// What the Plugin's own changes do to the Query entries it keeps (ADR-0060).
export class EntryWrites {
  constructor(
    private readonly entriesOf: (pluginId: string) => Map<string, QueryEntry>,
  ) {}

  // Every answer the Plugin kept is due.
  written(pluginId: string): void {
    for (const entry of this.entriesOf(pluginId).values()) entry.written();
  }

  // Only the Plugin's storage reads are due.
  storageWritten(pluginId: string): void {
    for (const entry of this.entriesOf(pluginId).values())
      if (entry.owner.query.api === 'storage') entry.written();
  }

  /*
   * A window of the Plugin's changes ended (ADR-0060): the entries a page holds that are still due from them are read
   * again now, so only the addresses whose answer differs are marked. The answers were made due as the changes came.
   */
  async changed(pluginId: string): Promise<void> {
    const entries = this.entriesOf(pluginId).values();

    await Promise.all(entries.map((entry) => entry.refreshHeld()));
  }

  // The addresses a page's draw holds some Query of, by key.
  heldKeys(pluginId: string): Set<string> {
    return new Set(
      this.entriesOf(pluginId)
        .values()
        .flatMap((entry) => entry.heldKeys),
    );
  }

  // A list's clock ticked: only the answers a Slot read that are as old as its interval are due.
  dueWhenOlder(pluginId: string, ms: number): void {
    for (const entry of this.entriesOf(pluginId).values())
      entry.dueWhenOlder(ms);
  }
}
