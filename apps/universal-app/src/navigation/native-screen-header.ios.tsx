import {
  HeaderButton,
  hasLiquidGlass,
  type ScreenHeaderProps,
} from '@repo/client';
import { Stack } from 'expo-router';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { rightItems } from './header-right-items';
import { headerSearchOptions } from './header-search-options';

type Action = NonNullable<NonNullable<ScreenHeaderProps['search']>['action']>;

// iOS draws the native search bar: iOS 26 docks it at the bottom, in the thumb's reach; earlier iOS stacks it below the header row, since an integrated bar there falls back to inline and squeezes the title. The search's action, such as New Session, is a header item on every iOS.
export function NativeScreenHeader({
  title,
  left,
  right = [],
  search,
}: ScreenHeaderProps): React.JSX.Element {
  const action = search?.action ? [actionButton(search.action)] : [];
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerLeft: left ? () => left : undefined,
          ...rightItems([...right, ...action]),
          headerSearchBarOptions: search && {
            ...headerSearchOptions(search),
            placement: hasLiquidGlass ? 'integrated' : 'stacked',
            // Before iOS 26 a focused bar hides the header row, but not our custom items in it, which pile up in its corner; the row stays.
            hideNavigationBar: hasLiquidGlass,
          },
        }}
      />
      {search && hasLiquidGlass && <BottomSearch />}
    </>
  );
}

// The docked bar.
function BottomSearch(): React.JSX.Element {
  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.SearchBarSlot />
    </Stack.Toolbar>
  );
}

function actionButton(action: Action): ReactElement {
  return (
    <HeaderButton
      key="search-action"
      icon={action.icon}
      paired
      accessibilityLabel={action.accessibilityLabel}
      onPress={action.onPress}
    />
  );
}
