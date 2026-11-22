import { Menu as SwiftMenu } from '@expo/ui/swift-ui';
import type { ReactElement } from 'react';
import { Host } from '#primitives/native/host';
import {
  nativeMenuSections,
  swiftMenuSections,
} from '#primitives/overlays/menu';
import { useFixedSizeChrome } from './fixed-size-chrome';
import type { IconButtonMenuProps } from './icon-button-menu-props';
import { swiftButtonModifiers, swiftSystemImage } from './icon-button.ios';

// A SwiftUI Menu whose label is the icon button itself: the button styles draw the menu's label as they draw a Button.
export function IconButtonMenu(props: IconButtonMenuProps): ReactElement {
  const fixed = useFixedSizeChrome();

  return (
    <Host seed="primary" matchContents>
      <SwiftMenu
        label={props.accessibilityLabel}
        systemImage={swiftSystemImage(props)}
        modifiers={swiftButtonModifiers(props, fixed)}
      >
        {swiftMenuSections(nativeMenuSections({ actions: props.actions }))}
      </SwiftMenu>
    </Host>
  );
}
