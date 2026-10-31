import { useQueries } from '@tanstack/react-query';
import type * as React from 'react';
import { slotChoicesQuery, slotVisibility } from '#features/settings';
import {
  slotDetailHref,
  useNavigate,
} from '#lib/product/navigation/navigation';
import { useServerScope } from '#lib/product/server-scope';
import { PluginListView, type SlotLink } from './plugin-list-view';
import type { SlotDetail } from './slots/$id/slot-detail';
import { fillingPlugins, shownCount } from './slots/$id/slot-detail-model';
import { slotDetails } from './slots/$id/slot-detail-registry';
import { toSlotPlugins } from './slots/$id/slot-plugin-list';
import {
  type PluginEntry,
  usePluginEntries,
  usePluginsLoad,
} from './use-plugins';

// A declared Slot's row, while some Plugin fills it, with how many are on in it.
function slotLink(
  settings: SlotDetail,
  plugins: readonly PluginEntry[],
  hidden: readonly string[] = [],
): SlotLink[] {
  const { shows } = slotVisibility({ hidden, owner: null });
  const filling = toSlotPlugins(settings, plugins, shows);

  if (fillingPlugins(filling).length === 0) return [];

  return [{ ...pick(settings), count: shownCount(filling) }];
}

const pick = ({ slotId, title }: SlotDetail): Omit<SlotLink, 'count'> => ({
  slotId,
  title,
});

// Every declared Slot some Plugin fills, once the Server has answered.
function useSlotLinks(): SlotLink[] {
  const { plugins = [] } = usePluginEntries();

  const serverId = useServerScope().id;

  const choices = useQueries({
    queries: slotDetails.map(({ slotId }) =>
      slotChoicesQuery(serverId, slotId),
    ),
  });

  return slotDetails.flatMap((settings, index) =>
    slotLink(settings, plugins, choices[index]?.data?.hidden),
  );
}

export function PluginListScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <PluginListView
      plugins={usePluginsLoad()}
      slots={useSlotLinks()}
      onOpenPlugin={(pluginId) => navigate(`/settings/plugins/${pluginId}`)}
      onOpenSlot={(slotId) => navigate(slotDetailHref(slotId))}
    />
  );
}
