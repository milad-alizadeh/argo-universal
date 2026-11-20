import { type SlotVisibility, slotVisibility } from '#features/settings';

// A Plugin that fills a Slot, with this Device's switch for it.
export interface SlotPlugin {
  pluginId: string;
  name: string;
  shown: boolean;
}

// What the Slot shows under the page's switches, by the same rules the Slot itself follows.
export const visibilityOf = (plugins: readonly SlotPlugin[]): SlotVisibility =>
  slotVisibility({
    hidden: plugins.flatMap((plugin) =>
      plugin.shown ? [] : [plugin.pluginId],
    ),
  });

export const shownCount = (plugins: readonly SlotPlugin[]): number =>
  plugins.filter((plugin) => plugin.shown).length;
