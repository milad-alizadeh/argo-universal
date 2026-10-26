import type { SlotPart, SlotPreviewProps, SlotSample } from './slot-settings';

// A Plugin that fills a Slot, with this Device's switch for it.
export interface SlotPlugin {
  pluginId: string;
  name: string;
  shown: boolean;
  // What the preview shows of this Plugin.
  sample: SlotSample;
  // What this Plugin writes in the Slot's replaceable part; left out when it does not ask for the part.
  part?: string;
}

// The replaceable part's two writers: Argo, or one Plugin by id.
export type SlotOwner = string | null;

export const argoOptionValue = 'argo';

const pluginOptionPrefix = 'plugin:';

export const optionValueOf = (owner: SlotOwner): string =>
  owner === null ? argoOptionValue : `${pluginOptionPrefix}${owner}`;

export const ownerOfOption = (value: string): SlotOwner =>
  value.startsWith(pluginOptionPrefix)
    ? value.slice(pluginOptionPrefix.length)
    : null;

// Only the Plugins that ask for the replaceable part are listed for it.
export const askingPlugins = (plugins: readonly SlotPlugin[]): SlotPlugin[] =>
  plugins.filter((plugin) => plugin.part !== undefined);

/*
 * The Plugin that writes the part: the chosen one while it is listed and its switch is on. A Plugin turned off gives
 * the part back to Argo, so a hidden Plugin never writes it.
 */
export function effectiveOwner(
  plugins: readonly SlotPlugin[],
  owner: SlotOwner,
): SlotPlugin | undefined {
  return askingPlugins(plugins).find(
    (plugin) => plugin.pluginId === owner && plugin.shown,
  );
}

export const shownCount = (plugins: readonly SlotPlugin[]): number =>
  plugins.filter((plugin) => plugin.shown).length;

export interface PartOption {
  value: string;
  label: string;
  subtitle: string;
  subtitleTone?: 'warning';
  disabled?: boolean;
}

const optionOf = (
  plugin: SlotPlugin,
  owner: SlotPlugin | undefined,
): PartOption => ({
  value: optionValueOf(plugin.pluginId),
  label: plugin.name,
  ...pluginSubtitle(plugin, owner),
});

type Subtitle = Pick<PartOption, 'subtitle' | 'subtitleTone' | 'disabled'>;

function pluginSubtitle(
  plugin: SlotPlugin,
  owner: SlotPlugin | undefined,
): Subtitle {
  if (!plugin.shown)
    return { subtitle: 'Off. Turn it on to choose it.', disabled: true };

  return conflictSubtitle(plugin, owner) ?? writesSubtitle(plugin);
}

// A Plugin that asks while another holds the part warns whom it would replace.
const conflictSubtitle = (
  plugin: SlotPlugin,
  owner: SlotPlugin | undefined,
): Subtitle | undefined =>
  owner && owner.pluginId !== plugin.pluginId
    ? {
        subtitle: `Also asks. Replaces ${owner.name}.`,
        subtitleTone: 'warning',
      }
    : undefined;

const writesSubtitle = ({ part }: SlotPlugin): Subtitle => ({
  subtitle: `Writes it, such as “${part ?? ''}”.`,
});

// Argo's own, then each Plugin that asks for the part.
export function partOptions(
  part: SlotPart,
  plugins: readonly SlotPlugin[],
  owner: SlotOwner,
): PartOption[] {
  const holder = effectiveOwner(plugins, owner);

  return [
    {
      value: argoOptionValue,
      label: 'Argo’s own',
      subtitle: part.argoSubtitle,
    },
    ...askingPlugins(plugins).map((plugin) => optionOf(plugin, holder)),
  ];
}

// The samples of the Plugins that are on, in the Plugins' order, and what the part's owner writes.
export const previewProps = (
  plugins: readonly SlotPlugin[],
  owner: SlotOwner,
): SlotPreviewProps => ({
  samples: plugins.flatMap((plugin) => (plugin.shown ? [plugin.sample] : [])),
  part: effectiveOwner(plugins, owner)?.part,
});
