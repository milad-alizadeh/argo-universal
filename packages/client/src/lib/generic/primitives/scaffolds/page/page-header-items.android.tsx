// Android keeps the stock Toolbar and search; its primary Action is the Material FAB (page-accessory).
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { DeclaredAction } from '#primitives/actions/action-list';
import { IconButton } from '#primitives/actions/icon-button';
import { Menu } from '#primitives/overlays/menu';
import { PageActionButton } from './page-action-button.android';
import { headerActions } from './page-action-groups';
import type { PageHeaderInput } from './page-props';
import { PageSearchBar } from './page-search-bar.android';

export const pageTitleOptions = { headerTitleAlign: 'left' } as const;

export function PageHeaderItems(props: PageHeaderInput): ReactElement {
  const { actions, label } = props.header;
  const header = { actions, label, search: Boolean(props.search) };

  const options = {
    headerRight: (): ReactElement => <HeaderActions {...header} />,
  };

  return (
    <>
      <Stack.Screen options={options} />
      {props.search ? <PageSearchBar {...props} /> : null}
    </>
  );
}

interface HeaderActionsProps {
  actions: DeclaredAction[];
  label: string;
  search: boolean;
}

function HeaderActions(props: HeaderActionsProps): ReactElement {
  const { direct, overflow } = splitHeaderActions(props);

  return (
    <View className="flex-row items-center">
      {direct.map(headerButton)}
      {overflowMenu(overflow, props.label)}
    </View>
  );
}

function headerButton(action: DeclaredAction): ReactElement {
  return <PageActionButton key={action.id} action={action} />;
}

function overflowMenu(
  actions: DeclaredAction[],
  label: string,
): ReactElement | null {
  if (!actions.length) return null;

  return (
    <Menu
      accessibilityLabel={label}
      trigger={moreTrigger(label)}
      actions={actions}
    />
  );
}

function moreTrigger(label: string): ReactElement {
  return (
    <IconButton
      icon={{ sf: 'ellipsis', material: 'more_vert' }}
      accessibilityLabel={label}
      variant="ghost"
    />
  );
}

function splitHeaderActions(props: {
  actions: DeclaredAction[];
  search: boolean;
}): ReturnType<typeof headerActions> {
  return headerActions(props.actions, props.search ? 1 : 2);
}
