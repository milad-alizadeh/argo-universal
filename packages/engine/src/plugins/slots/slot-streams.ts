import { drawsPluginWire } from '@repo/contracts/plugins/kit';
import type {
  AddOnlySlotId,
  SlotItems,
  SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import type { RpcConnection } from '../../rpc';
import { fillsSlot } from '../discovery/plugin-contributions';
import type { PluginServiceDeps } from '../located-plugins';
import { startOrderedPlugins } from '../plugin-order';
import { watchSlotItems, type Contributors } from './slot-items';

type Failed = Contributors['failed'];

// A contribution left out is reported like any other Plugin failure, once per Plugin, Slot and reason.
const failedOf =
  ({ pluginRuntime }: PluginServiceDeps): Failed =>
  (pluginId, slotId, reason) =>
    pluginRuntime.contributionFailed({ pluginId, slotId, reason });

async function fillingPlugins(
  deps: PluginServiceDeps,
  slot: { slotId: AddOnlySlotId },
): Promise<string[]> {
  const { running } = await startOrderedPlugins(deps, ({ plugin }) =>
    fillsSlot(plugin, slot),
  );

  return running;
}

/*
 * One list's Plugin items for an items Slot, merged and limited for the App's surface (ADR-0035).
 * When no Plugin declares the Slot nothing is started and nothing reaches the Plugin host; an App
 * below the wire minimum gets no Plugin items.
 */
export async function* slotItemsFor(
  deps: PluginServiceDeps,
  input: SlotItemsInput,
  connection: RpcConnection,
): AsyncGenerator<SlotItems> {
  const { surface, signal } = connection;

  const pluginIds = drawsPluginWire(surface)
    ? await fillingPlugins(deps, input)
    : [];

  if (!pluginIds.length) return yield {};

  const contributors = { pluginIds, input, surface, failed: failedOf(deps) };

  yield* watchSlotItems(deps.pluginRuntime.items, contributors, signal);
}
