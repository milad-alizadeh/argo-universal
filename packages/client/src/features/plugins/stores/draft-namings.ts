import type { StaleMark } from '@repo/contracts/plugins/page-address';
import { listenerSet } from '@repo/kit/listener-set';
import { useSyncExternalStore } from 'react';
import type { DraftNaming } from '../../../lib/product/plugin-registry';

export class DraftNamings {
  private readonly named = new Map<string, DraftNaming>();
  private readonly listeners = listenerSet();
  private serial = 0;

  public name(pluginId: string, region: string): void {
    this.serial += 1;
    this.named.set(pluginId, { region, serial: this.serial });

    this.listeners.notify();
  }

  public heard({ pluginId, region }: StaleMark): void {
    if (region) this.name(pluginId, region);
  }

  public of(pluginId: string): DraftNaming | undefined {
    return this.named.get(pluginId);
  }

  public subscribe = this.listeners.subscribe;
}

export const draftNamings = new DraftNamings();

export function useDraftNaming(pluginId: string): DraftNaming | undefined {
  return useSyncExternalStore(draftNamings.subscribe, () =>
    draftNamings.of(pluginId),
  );
}
