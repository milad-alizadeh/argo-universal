import {
  itemsSlot,
  type ItemsSlotItem,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import {
  contextKey,
  type ItemsAnswer,
  type LeftOut,
  type PluginItems,
} from './kept-items';

// How many contexts one Plugin's Slot keeps; the least recently answered go first, so ended Sessions do not pile up.
export const lastGoodLimit = 1000;

type Held = Map<string, readonly ItemsSlotItem[]>;

const noneHeld: Held = new Map();

const holdsAny = (items: PluginItems): boolean =>
  Object.values(items).some((held) => held.length > 0);

// A Map keeps keys in the order they were set, and `record` sets each answered one again, so the oldest lead.
function trim(held: Held): void {
  const over = [...held.keys()].slice(
    0,
    Math.max(0, held.size - lastGoodLimit),
  );

  for (const key of over) held.delete(key);
}

function heldItems(held: Held, input: SlotItemsInput): PluginItems {
  const entry = itemsSlot(input.slotId);

  return Object.fromEntries(
    input.contexts.map((context) => {
      const key = entry ? contextKey(entry, context) : '';

      return [key, held.get(key) ?? []];
    }),
  );
}

export function leftOutReason(
  answer: ItemsAnswer,
): LeftOut['reason'] | undefined {
  if ('standingInFor' in answer) return answer.standingInFor;

  return answer.ok ? undefined : answer.reason;
}

/*
 * Each Plugin's last good items, by Slot and context (GLOSSARY: Last good items). A change signal or a restart
 * throws away what the worker kept, so without these a late answer, a failure or a Plugin not running yet would
 * empty every list it fills until it next answers in time.
 */
export class LastGoodItems {
  private readonly held = new Map<string, Map<string, Held>>();

  // A fresh answer replaces what was held for its contexts, an answer of no items included.
  record(pluginId: string, input: SlotItemsInput, items: PluginItems): void {
    const held = this.slotHeld(pluginId, input.slotId);

    for (const [key, answered] of Object.entries(items)) {
      held.delete(key);
      held.set(key, answered);
    }

    trim(held);
  }

  standIn(
    pluginId: string,
    input: SlotItemsInput,
    answer: ItemsAnswer,
  ): ItemsAnswer {
    return answer.ok ? answer : this.heldFor(pluginId, input, answer);
  }

  // A Plugin turned off or removed draws nothing it answered before.
  forget(pluginId: string): void {
    this.held.delete(pluginId);
  }

  clear(): void {
    this.held.clear();
  }

  private heldFor(
    pluginId: string,
    input: SlotItemsInput,
    answer: LeftOut,
  ): ItemsAnswer {
    const items = heldItems(this.heldOf(pluginId, input.slotId), input);

    return holdsAny(items)
      ? { ok: true, items, standingInFor: answer.reason }
      : answer;
  }

  private heldOf(pluginId: string, slotId: string): Held {
    return this.held.get(pluginId)?.get(slotId) ?? noneHeld;
  }

  private slotHeld(pluginId: string, slotId: string): Held {
    const slots = this.held.get(pluginId) ?? new Map<string, Held>();
    const held = slots.get(slotId) ?? new Map();

    this.held.set(pluginId, slots.set(slotId, held));

    return held;
  }
}
