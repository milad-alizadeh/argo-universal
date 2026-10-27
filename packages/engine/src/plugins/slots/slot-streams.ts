import { drawsPluginWire } from '@repo/contracts/plugins/kit';
import type {
  AddOnlySlotId,
  PluginSlotInput,
  SlotItems,
  SlotItemsInput,
  SlotMessage,
} from '@repo/contracts/plugins/wire';
import type { RpcConnection } from '../../rpc';
import { fillsSlot } from '../discovery/plugin-contributions';
import type { PluginServiceDeps } from '../located-plugins';
import { startOrderedPlugins } from '../plugin-order';
import { watchSlotItems, type Contributors } from './slot-items';
import { slotViews } from './slot-views';

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

// Every enabled Plugin that declares the Slot fills it; one that fails to start is left out, and its failure is reported like any other.
export async function* slotFor(
  deps: PluginServiceDeps,
  slot: PluginSlotInput,
  connection: RpcConnection,
): AsyncGenerator<SlotMessage> {
  const pluginIds = await fillingPlugins(deps, slot);

  yield { type: 'contributors', pluginIds };
  yield* slotViews(
    deps.pluginRuntime.views,
    { pluginIds, slot, failed: failedOf(deps) },
    connection,
  );
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
