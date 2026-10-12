import {
  HeaderButton,
  hasLiquidGlass,
  iconSymbols,
  type ScreenHeaderProps,
} from '@repo/client';
import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type * as React from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { rightItems } from './header-right-items';

type Search = NonNullable<ScreenHeaderProps['search']>;
type Action = NonNullable<Search['action']>;

// iOS draws the native search bar; iOS 26 docks it at the bottom, in the thumb's reach.
export function NativeScreenHeader({
  title,
  left,
  right = [],
  search,
}: ScreenHeaderProps): React.JSX.Element {
  // Before iOS 26 the bar is in the header, so the search's action joins the trailing items.
  const action =
    search?.action && !hasLiquidGlass ? [actionButton(search.action)] : [];
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerLeft: left ? () => left : undefined,
          ...rightItems([...right, ...action]),
          headerSearchBarOptions: search ? searchBarOptions(search) : undefined,
        }}
      />
      {search && hasLiquidGlass && <BottomSearch action={search.action} />}
    </>
  );
}

// The docked bar, with its action beside it, such as New Session.
function BottomSearch({ action }: { action?: Action }): React.JSX.Element {
  const symbol = action && iconSymbols[action.icon].sf;
  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.SearchBarSlot />
      {action && (
        <Stack.Toolbar.Button
          icon={symbol && isSystemSymbol(symbol) ? symbol : undefined}
          accessibilityLabel={action.accessibilityLabel}
          onPress={action.onPress}
        />
      )}
    </Stack.Toolbar>
  );
}

type ToolbarSymbol = Extract<
  ComponentProps<typeof Stack.Toolbar.Button>['icon'],
  string
>;

// Argo's custom symbols have no SF name, so a docked action takes a system one.
function isSystemSymbol(name: string): name is ToolbarSymbol {
  return !name.startsWith('custom.');
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

function searchBarOptions(
  search: Search,
): NativeStackNavigationOptions['headerSearchBarOptions'] {
  return {
    placeholder: search.placeholder,
    placement: 'integrated',
    autoCapitalize: 'none',
    hideWhenScrolling: false,
    onChangeText: ({ nativeEvent }) => search.onChangeText(nativeEvent.text),
    onCancelButtonPress: () => search.onChangeText(''),
    onClose: () => search.onChangeText(''),
  };
}
