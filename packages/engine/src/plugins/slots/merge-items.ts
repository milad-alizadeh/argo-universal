import type { PluginSurface } from '@repo/contracts/plugins/kit';
import type {
  AnyItemsSlot,
  ItemsContext,
  ItemsSlotItem,
} from '@repo/contracts/plugins/wire';
import { contextKey, type PluginItems } from './kept-items';

type Attributed = { pluginId: string; item: ItemsSlotItem };

type Merged = { items: Attributed[]; overflow: Attributed[] };

export type MergedItems = Readonly<Record<string, Merged>>;

// One Plugin's answer, in the Slot's Plugin order.
export type Contribution = { pluginId: string; items: PluginItems };

// One list's contexts, and the surface that decides how many items each shows.
export type MergeTarget = {
  entry: AnyItemsSlot;
  contexts: readonly ItemsContext[];
  surface: PluginSurface | undefined;
};

const phones: ReadonlySet<PluginSurface['platform']> = new Set([
  'ios',
  'android',
]);

// A phone (iOS, Android) shows the Slot's phone limit; macOS and web show its desktop limit.
export function shownLimit(
  { content }: AnyItemsSlot,
  surface: PluginSurface | undefined,
): number {
  const phone = surface !== undefined && phones.has(surface.platform);

  return phone ? content.limit.phone : content.limit.desktop;
}

/*
 * Plugin items for each context, in the order the contributions come (ADR-0035): up to the limit
 * shown, the rest kept as overflow for "+N", each with the Plugin it came from. Argo's own items are
 * the App's and go first; a context no Plugin adds to is left out.
 */
export function mergeItems(
  { entry, contexts, surface }: MergeTarget,
  contributions: readonly Contribution[],
): MergedItems {
  const limit = shownLimit(entry, surface);
  const keys = new Set(contexts.map((context) => contextKey(entry, context)));

  return Object.fromEntries(
    [...keys].flatMap((key) => {
      const all = attributed(key, contributions);

      return all.length ? [[key, split(all, limit)]] : [];
    }),
  );
}

const attributed = (
  key: string,
  contributions: readonly Contribution[],
): Attributed[] =>
  contributions.flatMap(({ pluginId, items }) =>
    (items[key] ?? []).map((item) => ({ pluginId, item })),
  );

const split = (all: Attributed[], limit: number): Merged => ({
  items: all.slice(0, limit),
  overflow: all.slice(limit),
});
