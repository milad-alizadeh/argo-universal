import type { Tone } from '@repo/kit/primitives/content/text';

// One item a Plugin puts on the Session row's meta line, as the preview draws it.
export interface PreviewItem {
  text: string;
  tone?: Tone;
}

// A Plugin that fills the Session row items Slot.
export interface SessionRowsPlugin {
  pluginId: string;
  name: string;
  shown: boolean;
  // What the preview shows of this Plugin's items.
  sample: PreviewItem;
  // The Activity line this Plugin asks to write; left out when it does not ask for the line.
  activity?: string;
}

// The Activity line's two writers: Argo, or one Plugin by id.
export type ActivityOwner = string | null;

export const argoActivity = 'Editing login.ts';

export const argoLineSubtitle = 'Status and time, as today.';

export const argoOptionValue = 'argo';

const pluginOptionPrefix = 'plugin:';

export const optionValueOf = (owner: ActivityOwner): string =>
  owner === null ? argoOptionValue : `${pluginOptionPrefix}${owner}`;

export const ownerOfOption = (value: string): ActivityOwner =>
  value.startsWith(pluginOptionPrefix)
    ? value.slice(pluginOptionPrefix.length)
    : null;

// Only the Plugins that ask for the Activity line are listed for it.
export const askingPlugins = (
  plugins: readonly SessionRowsPlugin[],
): SessionRowsPlugin[] =>
  plugins.filter((plugin) => plugin.activity !== undefined);

/*
 * The Plugin that writes the line: the chosen one while it is listed and its switch is on. A Plugin turned off on
 * Session rows gives the line back to Argo, so a hidden Plugin never writes it.
 */
export function effectiveOwner(
  plugins: readonly SessionRowsPlugin[],
  owner: ActivityOwner,
): SessionRowsPlugin | undefined {
  return askingPlugins(plugins).find(
    (plugin) => plugin.pluginId === owner && plugin.shown,
  );
}

export const shownCount = (plugins: readonly SessionRowsPlugin[]): number =>
  plugins.filter((plugin) => plugin.shown).length;

export interface ActivityOption {
  value: string;
  label: string;
  subtitle: string;
  subtitleTone?: 'warning';
  disabled?: boolean;
}

const optionOf = (
  plugin: SessionRowsPlugin,
  owner: SessionRowsPlugin | undefined,
): ActivityOption => ({
  value: optionValueOf(plugin.pluginId),
  label: plugin.name,
  ...pluginSubtitle(plugin, owner),
});

type Subtitle = Pick<ActivityOption, 'subtitle' | 'subtitleTone' | 'disabled'>;

function pluginSubtitle(
  plugin: SessionRowsPlugin,
  owner: SessionRowsPlugin | undefined,
): Subtitle {
  if (!plugin.shown)
    return { subtitle: 'Off. Turn it on to choose it.', disabled: true };

  return conflictSubtitle(plugin, owner) ?? writesSubtitle(plugin);
}

// A Plugin that asks while another holds the line warns whom it would replace.
const conflictSubtitle = (
  plugin: SessionRowsPlugin,
  owner: SessionRowsPlugin | undefined,
): Subtitle | undefined =>
  owner && owner.pluginId !== plugin.pluginId
    ? {
        subtitle: `Also asks. Replaces ${owner.name}.`,
        subtitleTone: 'warning',
      }
    : undefined;

const writesSubtitle = ({ activity }: SessionRowsPlugin): Subtitle => ({
  subtitle: `Writes the line, such as “${activity ?? ''}”.`,
});

// Argo's own, then each Plugin that asks for the line.
export function activityOptions(
  plugins: readonly SessionRowsPlugin[],
  owner: ActivityOwner,
): ActivityOption[] {
  const holder = effectiveOwner(plugins, owner);

  return [
    {
      value: argoOptionValue,
      label: 'Argo’s own',
      subtitle: argoLineSubtitle,
    },
    ...askingPlugins(plugins).map((plugin) => optionOf(plugin, holder)),
  ];
}

export interface SessionRowPreviewContent {
  title: string;
  activity: string;
  items: PreviewItem[];
}

export const previewTitle = 'Fix login redirect';

export const issueRef = (number: number): string => `#${number}`;

const sessionIssue = 1301;

export const argoItems: PreviewItem[] = [
  { text: '2m' },
  { text: issueRef(sessionIssue) },
];

// Argo's own meta items come first, then each Plugin whose switch is on, in the Plugins' order.
export function previewContent(
  plugins: readonly SessionRowsPlugin[],
  owner: ActivityOwner,
): SessionRowPreviewContent {
  return {
    title: previewTitle,
    activity: effectiveOwner(plugins, owner)?.activity ?? argoActivity,
    items: [
      ...argoItems,
      ...plugins.flatMap((plugin) => (plugin.shown ? [plugin.sample] : [])),
    ],
  };
}
