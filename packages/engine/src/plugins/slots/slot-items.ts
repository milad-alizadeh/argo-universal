import type { PluginSurface } from '@repo/contracts/plugins/kit';
import {
  itemsSlot,
  SlotItems,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { itemsLeftOut, type ItemsAnswer } from './kept-items';
import { mergeItems, type Contribution } from './merge-items';
import type { PluginSlotItems } from './plugin-slot-items';

// Last displayed contributions belong to this subscription and its fixed contexts alone.
type Reading = Contributors & { previous: Map<string, Contribution> };

export type Contributors = {
  pluginIds: readonly string[];
  input: SlotItemsInput;
  surface: PluginSurface | undefined;
  failed: (pluginId: string, slotId: string, reason: string) => void;
  /*
   * Starts the Plugins that fill the Slot and are enabled. A list on a refresh clock calls it for a Plugin that is not
   * running, so one turned off and on again while the list stays open comes back into it; a list without a clock never does.
   */
  start: () => Promise<void>;
  // Whether the person left the Plugin on, so a Plugin they turned off keeps no refresh clock.
  enabled: (pluginId: string) => boolean;
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

const noRefresh = (): void => {};

// Holds the Slot's refresh clock for as long as this list is open, if the Slot has one.
function refreshing(
  slotItems: PluginSlotItems,
  { input, pluginIds, enabled }: Contributors,
): () => void {
  const ms = itemsSlot(input.slotId)?.content.refreshMs;

  return ms === undefined
    ? noRefresh
    : slotItems.refresh.hold(pluginIds, ms, enabled);
}

async function* merges(
  slotItems: PluginSlotItems,
  contributors: Contributors,
  signal: AbortSignal,
): AsyncGenerator<SlotItems> {
  const release = refreshing(slotItems, contributors);

  try {
    yield* mergesOf(slotItems, contributors, signal);
  } finally {
    // The list is closed, so nothing asks its Plugins again for it (ADR-0052).
    release();
  }
}

async function* mergesOf(
  slotItems: PluginSlotItems,
  contributors: Contributors,
  signal: AbortSignal,
): AsyncGenerator<SlotItems> {
  const { changes } = slotItems;
  const reading: Reading = { ...contributors, previous: new Map() };

  for (let version = -1; await changes.after(version, signal);) {
    version = changes.version;
    yield await merged(slotItems, reading);
  }
}

async function merged(
  slotItems: PluginSlotItems,
  contributors: Reading,
): Promise<SlotItems> {
  const { input, surface } = contributors;
  const entry = itemsSlot(input.slotId);

  if (!entry) return {};

  const answers = await answered(slotItems, contributors);
  const target = { entry, contexts: input.contexts, surface };

  return SlotItems.parse(mergeItems(target, answers));
}

// Each Plugin answers independently; a slow refresh may keep its last displayed contribution.
async function answered(
  slotItems: PluginSlotItems,
  contributors: Reading,
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
  { input, failed, start, previous, enabled }: Reading,
  pluginId: string,
): Promise<Contribution[]> {
  const answer = await askedAgain(slotItems, { input, start }, pluginId);

  if (answer.ok) return rememberContribution(previous, pluginId, answer.items);

  failed(pluginId, input.slotId, answer.reason);

  return lateContribution(
    { input, previous, enabled },
    pluginId,
    answer.reason,
  );
}

function rememberContribution(
  previous: Reading['previous'],
  pluginId: string,
  items: Contribution['items'],
): Contribution[] {
  const contribution = { pluginId, items };

  previous.set(pluginId, contribution);

  return [contribution];
}

const mayKeep = (input: SlotItemsInput, reason: string): boolean =>
  reason === itemsLeftOut.late && refreshes(input);

function lateContribution(
  { input, previous, enabled }: Pick<Reading, 'input' | 'previous' | 'enabled'>,
  pluginId: string,
  reason: string,
): Contribution[] {
  if (!mayKeep(input, reason) || !enabled(pluginId)) previous.delete(pluginId);

  return [...previous.values()].filter((kept) => kept.pluginId === pluginId);
}

const refreshes = ({ slotId }: SlotItemsInput): boolean =>
  itemsSlot(slotId)?.content.refreshMs !== undefined;

const notRunning = (answer: ItemsAnswer): boolean =>
  !answer.ok && answer.reason === itemsLeftOut.notRunning;

// A Plugin that is not running is started once if the list has a clock, then asked again.
async function askedAgain(
  slotItems: PluginSlotItems,
  { input, start }: Pick<Contributors, 'input' | 'start'>,
  pluginId: string,
): Promise<ItemsAnswer> {
  const answer = await slotItems.items(pluginId, input);

  if (!refreshes(input) || !notRunning(answer)) return answer;
  await start();

  return slotItems.items(pluginId, input);
}
