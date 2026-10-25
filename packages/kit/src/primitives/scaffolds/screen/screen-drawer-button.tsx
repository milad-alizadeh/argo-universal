import type { ReactElement } from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import type { ScreenMenu } from './screen-menu-context';

// ☰ in a JS header: Android's top app bar and the web's stack header. iOS declares a stock bar button item instead.
export function ScreenDrawerButton({
  menu,
}: {
  menu: ScreenMenu;
}): ReactElement {
  return (
    <View>
      <IconButton
        variant="ghost"
        icon="menu"
        accessibilityLabel="Open navigation"
        onPress={menu.onOpen}
      />
      {menu.badge ? <AttentionDot /> : null}
    </View>
  );
}

function AttentionDot(): ReactElement {
  return (
    <View
      testID="header-button-dot"
      className="absolute top-2.5 right-2.25 size-1.75 rounded-full border-2 border-card bg-warning"
    />
  );
}
