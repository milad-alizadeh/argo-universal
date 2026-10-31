import type * as React from 'react';
import {
  PlaceholderDetailView,
  useSlotChoices,
  useSlotChoosers,
} from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import type { SlotDetail } from './slot-detail';
import { findSlotDetail } from './slot-detail-registry';
import { SlotDetailView, type SlotDetailViewProps } from './slot-detail-view';
import { useSlotPlugins } from './slot-plugins';

// The page of the Slot declared for `slotId`; an old link to a Slot without one says so.
export function SlotDetailScreen({
  slotId,
}: {
  slotId: string;
}): React.JSX.Element {
  const settings = findSlotDetail(slotId);

  if (!settings)
    return (
      <PlaceholderDetailView title="Plugins" description="No such page." />
    );

  return <DeclaredSlot settings={settings} />;
}

// The Slot's Plugins and both of this Device's choices; the Slot's own component reads them where it is drawn.
type SlotState = Pick<
  SlotDetailViewProps,
  'plugins' | 'owner' | 'onShownChange' | 'onOwnerChange'
>;

const useSlotState = (settings: SlotDetail): SlotState => ({
  plugins: useSlotPlugins(settings),
  owner: useSlotChoices(settings.slotId).owner,
  ...useSlotChoosers(settings.slotId),
});

function DeclaredSlot({
  settings,
}: {
  settings: SlotDetail;
}): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <SlotDetailView
      settings={settings}
      {...useSlotState(settings)}
      onBack={() => navigate('/settings/plugins')}
    />
  );
}
