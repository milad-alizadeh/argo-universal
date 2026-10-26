import type { PluginSurface } from '@repo/contracts/plugins/kit';
import {
  itemsSlot,
  SlotItems,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { mergeItems, type Contribution } from './merge-items';
import type { PluginSlotItems } from './plugin-slot-items';

export type Contributors = {
  pluginIds: readonly string[];
  input: SlotItemsInput;
  surface: PluginSurface | undefined;
  failed: (pluginId: string, slotId: string, reason: string) => void;
};

/*
 * One list's Plugin items: every contributor asked at once, merged in their order, then asked again
 * each time a Plugin says its items changed or a worker comes or goes. An unchanged answer is not sent.
 */
export async function* watchSlotItems(
  slotItems: PluginSlotItems,
  contributors: Contributors,
  signal: AbortSignal,
): AsyncGenerator<SlotItems> {
  let last: string | undefined;

  for await (const merged of merges(slotItems, contributors, signal)) {
    const text = JSON.stringify(merged);

    if (text !== last) yield merged;
    last = text;
  }
}

async function* merges(
  slotItems: PluginSlotItems,
  contributors: Contributors,
  signal: AbortSignal,
): AsyncGenerator<SlotItems> {
  const { changes } = slotItems;

  for (let version = -1; await changes.after(version, signal);) {
    version = changes.version;
    yield await merged(slotItems, contributors);
  }
}

async function merged(
  slotItems: PluginSlotItems,
  contributors: Contributors,
): Promise<SlotItems> {
  const { input, surface } = contributors;
  const entry = itemsSlot(input.slotId);

  if (!entry) return {};

  const answers = await answered(slotItems, contributors);
  const target = { entry, contexts: input.contexts, surface };

  return SlotItems.parse(mergeItems(target, answers));
}

// A Plugin that is not running, throws, runs late or answers off-schema is left out alone.
async function answered(
  slotItems: PluginSlotItems,
  contributors: Contributors,
): Promise<Contribution[]> {
  const answers = await Promise.all(
    contributors.pluginIds.map((pluginId) =>
      contribution(slotItems, contributors, pluginId),
    ),
  );

  return answers.flat();
}

async function contribution(
  slotItems: PluginSlotItems,
  { input, failed }: Contributors,
  pluginId: string,
): Promise<Contribution[]> {
  const answer = await slotItems.items(pluginId, input);

  if (answer.ok) return [{ pluginId, items: answer.items }];
  failed(pluginId, input.slotId, answer.reason);

  return [];
}
