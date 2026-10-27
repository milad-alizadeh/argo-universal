import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  isSubmenu,
  type HeaderEntry,
  type ScreenHeader,
} from '#primitives/actions/action';
import { ScreenActionButton } from './screen-action-button.android';
import {
  ScreenOverflowButton,
  ScreenSubmenuButton,
} from './screen-menu-button.android';

// Direct Actions, submenus and the overflow menu are all stock Compose icon buttons, the menus stock DropdownMenus.
export function ToolbarActions({
  header,
}: {
  header: Pick<ScreenHeader, 'direct' | 'overflow' | 'label'>;
}): ReactElement {
  return (
    <View className="flex-row items-center">
      {header.direct.map(toolbarEntry)}
      <ScreenOverflowButton groups={header.overflow} label={header.label} />
    </View>
  );
}

function toolbarEntry(entry: HeaderEntry): ReactElement {
  if (isSubmenu(entry))
    return <ScreenSubmenuButton key={entry.id} submenu={entry} />;

  return <ScreenActionButton key={entry.id} action={entry} />;
}
