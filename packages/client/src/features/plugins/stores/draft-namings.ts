import { useSyncExternalStore } from 'react';
import type { DraftNaming } from '../../../lib/product/plugin-registry';

/*
 * The region of a Draft page each Plugin's Agent is writing, as the Server's stale marks named it (ADR-0057). Each
 * naming has a serial of its own, so naming the same region again is heard.
 */
export class DraftNamings {
  private readonly named = new Map<string, DraftNaming>();
  private readonly listeners = new Set<() => void>();
  private serial = 0;

  public name(pluginId: string, region: string): void {
    this.serial += 1;
    this.named.set(pluginId, { region, serial: this.serial });

    for (const listener of this.listeners) listener();
  }

  public of(pluginId: string): DraftNaming | undefined {
    return this.named.get(pluginId);
  }

  // The answer unsubscribes.
  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  };
}

export const draftNamings = new DraftNamings();

export function useDraftNaming(pluginId: string): DraftNaming | undefined {
  return useSyncExternalStore(draftNamings.subscribe, () =>
    draftNamings.of(pluginId),
  );
}
