import { useQueries } from '@tanstack/react-query';
import type * as React from 'react';
import {
  slotChoicesQuery,
  slotVisibility,
  useServerPageCaption,
} from '#features/settings';
import {
  slotSettingsHref,
  useNavigate,
} from '#lib/product/navigation/navigation';
import { PluginListView, type SlotLink } from './plugin-list-view';
import { toSlotPlugins } from './slots/slot-plugin-list';
import type { SlotSettings } from './slots/slot-settings';
import { fillingPlugins, shownCount } from './slots/slot-settings-model';
import { slotSettings } from './slots/slot-settings-registry';
import {
  type PluginEntry,
  usePluginEntries,
  usePluginsLoad,
} from './use-plugins';

// A declared Slot's row, while some Plugin fills it, with how many are on in it.
function slotLink(
  settings: SlotSettings,
  plugins: readonly PluginEntry[],
  hidden: readonly string[] = [],
): SlotLink[] {
  const { shows } = slotVisibility({ hidden, owner: null });
  const filling = toSlotPlugins(settings, plugins, shows);

  if (fillingPlugins(filling).length === 0) return [];

  return [{ ...pick(settings), count: shownCount(filling) }];
}

const pick = ({ slotId, title }: SlotSettings): Omit<SlotLink, 'count'> => ({
  slotId,
  title,
});

// Every declared Slot some Plugin fills, once the Server has answered.
function useSlotLinks(): SlotLink[] {
  const { plugins = [] } = usePluginEntries();

  const choices = useQueries({
    queries: slotSettings.map(({ slotId }) => slotChoicesQuery(slotId)),
  });

  return slotSettings.flatMap((settings, index) =>
    slotLink(settings, plugins, choices[index]?.data?.hidden),
  );
}

export function PluginListScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <PluginListView
      caption={useServerPageCaption()}
      plugins={usePluginsLoad()}
      slots={useSlotLinks()}
      onOpenPlugin={(pluginId) => navigate(`/settings/plugins/${pluginId}`)}
      onOpenSlot={(slotId) => navigate(slotSettingsHref(slotId))}
    />
  );
}
