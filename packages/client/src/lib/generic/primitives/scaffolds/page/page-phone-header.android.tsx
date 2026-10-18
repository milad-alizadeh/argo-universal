// Android keeps the stock Toolbar and search; its primary Action is a separate Material FAB above content.
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  ActionListHeaderContext,
  type DeclaredAction,
} from '#primitives/actions/action-list';
import { IconButton } from '#primitives/actions/icon-button';
import { Menu } from '#primitives/overlays/menu';
import { PageActionButton } from './page-action-button.android';
import { headerActions } from './page-action-groups';
import type { PageProps } from './page-props';
import { PageSearchBar } from './page-search-bar.android';
import { usePageActions } from './use-page-actions';

export function PagePhoneHeader(
  props: PageProps & { wide: boolean },
): ReactElement {
  const options = {
    title: props.title,
    headerShown: !props.wide,
    headerTitleAlign: 'left',
  } as const;

  return (
    <>
      <Stack.Screen options={options} />
      {props.wide ? null : <PageItems {...props} />}
    </>
  );
}

function PageItems(props: PageProps): ReactElement {
  const { register, actions, label } = usePageActions();
  const header = { actions, label, search: Boolean(props.search) };

  const options = {
    headerRight: (): ReactElement => <HeaderActions {...header} />,
  };

  return (
    <ActionListHeaderContext value={register}>
      <Stack.Screen options={options} />
      {props.actions}
      {props.search ? <PageSearchBar {...props} /> : null}
    </ActionListHeaderContext>
  );
}

function HeaderActions(props: {
  actions: DeclaredAction[];
  label: string;
  search: boolean;
}): ReactElement {
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
