// Android keeps the stock Toolbar and search; its primary Action is the Material FAB (page-accessory).
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  ActionListHeaderContext,
  isSubmenu,
  splitHeaderActions,
  type HeaderActionsProps,
  type HeaderEntry,
} from '#primitives/actions/action-list';
import { PageActionButton } from './page-action-button.android';
import {
  PageOverflowButton,
  PageSubmenuButton,
} from './page-menu-button.android';
import type { PageProps } from './page-props';
import { PageSearchBar } from './page-search-bar.android';
import { usePageActions } from './use-page-actions';

export const pageTitleOptions = { headerTitleAlign: 'left' } as const;

// The toolbar draws its items outside the Page's tree, so the ActionLists register their groups and the toolbar draws them.
export function PageHeaderItems(props: PageProps): ReactElement {
  const { register, ...actions } = usePageActions();
  // The search icon takes one of the toolbar's two places.
  const options = headerOptions({ ...actions, slots: props.search ? 1 : 2 });

  return (
    <ActionListHeaderContext value={register}>
      <Stack.Screen options={options} />
      {props.actions}
      {props.search ? <PageSearchBar {...props} /> : null}
    </ActionListHeaderContext>
  );
}

// A native stack's header and a drawer's both take the Actions as `headerRight`.
export interface HeaderRightOptions {
  headerRight: () => ReactElement;
}

export function headerOptions(header: HeaderActionsProps): HeaderRightOptions {
  return { headerRight: () => <ToolbarActions {...header} /> };
}

// Direct Actions, submenus and the overflow menu are all stock Compose icon buttons, the menus stock DropdownMenus.
function ToolbarActions(props: HeaderActionsProps): ReactElement {
  const { direct, overflow } = splitHeaderActions(props.groups, props.slots);

  return (
    <View className="flex-row items-center">
      {direct.map(toolbarEntry)}
      <PageOverflowButton groups={overflow} label={props.label} />
    </View>
  );
}

function toolbarEntry(entry: HeaderEntry): ReactElement {
  if (isSubmenu(entry))
    return <PageSubmenuButton key={entry.id} submenu={entry} />;

  return <PageActionButton key={entry.id} action={entry} />;
}
