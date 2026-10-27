// Android keeps the stock Toolbar and search; its primary Action is the Material FAB (page-accessory).
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { drawerLeading } from './screen-drawer-button';
import { useScreenMenu } from './screen-menu-context';
import type { ScreenHeaderInput } from './screen-props';
import { ScreenSearchBar } from './screen-search-bar.android';
import { SelectionItems } from './screen-selection-items.android';
import { ToolbarActions } from './screen-toolbar-actions.android';

export const screenTitleOptions = { headerTitleAlign: 'left' } as const;

/*
 * The toolbar draws its items outside the Screen's tree, so it draws the header the Screen declared. A selecting List's
 * header replaces the whole stack header, so none of these items are drawn meanwhile.
 */
export function ScreenHeaderItems(props: ScreenHeaderInput): ReactElement {
  const bar = props.declaration.selection?.bar;

  return bar ? <SelectionItems bar={bar} /> : <IdleItems {...props} />;
}

function IdleItems(props: ScreenHeaderInput): ReactElement | null {
  const header = props.headers.native;
  const leading = drawerLeading(useScreenMenu());

  if (header.selecting) return null;

  const headerRight = (): ReactElement => <ToolbarActions header={header} />;

  return (
    <>
      <Stack.Screen options={{ headerRight, ...leading }} />
      {props.search ? <ScreenSearchBar {...props} /> : null}
    </>
  );
}
