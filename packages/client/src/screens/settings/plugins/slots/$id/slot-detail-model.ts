import { type SlotVisibility, slotVisibility } from '#features/settings';
import type { OwnerSlot } from './slot-detail';

// A Plugin that fills a Slot or asks for its Single-owner Slot, with this Device's switch for it.
export interface SlotPlugin {
  pluginId: string;
  name: string;
  // Whether it declares the Slot itself, so it has a switch; one that only asks for the line has none.
  fills: boolean;
  shown: boolean;
  // Whether it also declares the Slot's Single-owner Slot, so it can be chosen to write it.
  asks: boolean;
}

// The Single-owner Slot's two writers: Argo, or one Plugin by id.
export type SlotOwner = string | null;

export const argoOptionValue = 'argo';

const pluginOptionPrefix = 'plugin:';

export const optionValueOf = (owner: SlotOwner): string =>
  owner === null ? argoOptionValue : `${pluginOptionPrefix}${owner}`;

export const ownerOfOption = (value: string): SlotOwner =>
  value.startsWith(pluginOptionPrefix)
    ? value.slice(pluginOptionPrefix.length)
    : null;

// Only the Plugins that ask for the Single-owner Slot are listed for it.
export const askingPlugins = (plugins: readonly SlotPlugin[]): SlotPlugin[] =>
  plugins.filter((plugin) => plugin.asks);

// What the Slot shows under the page's switches and choice, by the same rules the Slot itself follows.
export const visibilityOf = (
  plugins: readonly SlotPlugin[],
  owner: SlotOwner,
): SlotVisibility =>
  slotVisibility({
    hidden: plugins.flatMap((plugin) =>
      plugin.shown ? [] : [plugin.pluginId],
    ),
    owner,
  });

// The listed Plugin that writes the Single-owner Slot, while it is on.
export const effectiveOwner = (
  plugins: readonly SlotPlugin[],
  owner: SlotOwner,
): SlotPlugin | undefined => {
  const chosen = visibilityOf(plugins, owner).owner;

  return askingPlugins(plugins).find((plugin) => plugin.pluginId === chosen);
};

// The Plugins that declare the Slot, each with its switch.
export const fillingPlugins = (plugins: readonly SlotPlugin[]): SlotPlugin[] =>
  plugins.filter((plugin) => plugin.fills);

export const shownCount = (plugins: readonly SlotPlugin[]): number =>
  fillingPlugins(plugins).filter((plugin) => plugin.shown).length;

export interface OwnerOption {
  value: string;
  label: string;
  subtitle: string;
  subtitleTone?: 'warning';
  disabled?: boolean;
}

type Subtitle = Pick<OwnerOption, 'subtitle' | 'subtitleTone' | 'disabled'>;

const optionOf = (
  plugin: SlotPlugin,
  holder: SlotPlugin | undefined,
): OwnerOption => ({
  value: optionValueOf(plugin.pluginId),
  label: plugin.name,
  ...pluginSubtitle(plugin, holder),
});

function pluginSubtitle(
  plugin: SlotPlugin,
  holder: SlotPlugin | undefined,
): Subtitle {
  if (!plugin.shown)
    return { subtitle: 'Off. Turn it on to choose it.', disabled: true };

  return conflictSubtitle(plugin, holder) ?? writesSubtitle;
}

// A Plugin that asks while another holds the line warns whom it would replace.
const conflictSubtitle = (
  plugin: SlotPlugin,
  holder: SlotPlugin | undefined,
): Subtitle | undefined =>
  holder && holder.pluginId !== plugin.pluginId
    ? {
        subtitle: `Also asks. Replaces ${holder.name}.`,
        subtitleTone: 'warning',
      }
    : undefined;

const writesSubtitle: Subtitle = { subtitle: 'Writes it in place of Argo’s.' };

// Argo's own, then each Plugin that asks for the Single-owner Slot.
export function ownerOptions(
  ownerSlot: OwnerSlot,
  plugins: readonly SlotPlugin[],
  owner: SlotOwner,
): OwnerOption[] {
  const holder = effectiveOwner(plugins, owner);

  return [
    {
      value: argoOptionValue,
      label: 'Argo’s own',
      subtitle: ownerSlot.argoSubtitle,
    },
    ...askingPlugins(plugins).map((plugin) => optionOf(plugin, holder)),
  ];
}
