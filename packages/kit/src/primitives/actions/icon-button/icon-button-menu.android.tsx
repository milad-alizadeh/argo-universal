import type { ReactElement } from 'react';
import { Host } from '#primitives/native/host';
import { MenuDropdown, nativeMenuItems } from '#primitives/overlays/menu';
import type { IconButtonMenuProps } from './icon-button-menu-props';
import { ComposeControl } from './icon-button.android';

// A stock Compose icon button that opens the Menu primitive's stock DropdownMenu, as a Screen's header menus do.
export function IconButtonMenu({
  actions,
  ...button
}: IconButtonMenuProps): ReactElement {
  return (
    <Host seed="primary" matchContents>
      <MenuDropdown
        items={nativeMenuItems({ actions })}
        trigger={(open) => <ComposeControl {...button} onPress={open} />}
      />
    </Host>
  );
}
