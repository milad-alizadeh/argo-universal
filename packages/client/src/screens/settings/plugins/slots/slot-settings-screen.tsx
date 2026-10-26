import type * as React from 'react';
import {
  PlaceholderDetailView,
  useServerPageCaption,
  useSlotChoices,
  useSlotChoosers,
} from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { useSlotPlugins } from './slot-plugins';
import type { SlotSettings } from './slot-settings';
import { findSlotSettings } from './slot-settings-registry';
import {
  SlotSettingsView,
  type SlotSettingsViewProps,
} from './slot-settings-view';

// The page of the Slot declared for `slotId`; an old link to a Slot without one says so.
export function SlotSettingsScreen({
  slotId,
}: {
  slotId: string;
}): React.JSX.Element {
  const settings = findSlotSettings(slotId);

  if (!settings)
    return (
      <PlaceholderDetailView title="Plugins" description="No such page." />
    );

  return <DeclaredSlot settings={settings} />;
}

// The Slot's Plugins and both of this Device's choices; the Slot's own component reads them where it is drawn.
type SlotState = Pick<
  SlotSettingsViewProps,
  'plugins' | 'owner' | 'onShownChange' | 'onOwnerChange'
>;

const useSlotState = (settings: SlotSettings): SlotState => ({
  plugins: useSlotPlugins(settings),
  owner: useSlotChoices(settings.slotId).owner,
  ...useSlotChoosers(settings.slotId),
});

function DeclaredSlot({
  settings,
}: {
  settings: SlotSettings;
}): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <SlotSettingsView
      settings={settings}
      caption={useServerPageCaption()}
      {...useSlotState(settings)}
      onBack={() => navigate('/settings/plugins')}
    />
  );
}
