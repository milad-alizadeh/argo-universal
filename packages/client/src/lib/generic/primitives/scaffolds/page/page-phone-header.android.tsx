// Android keeps the stock Toolbar and search; only its primary Action is a Material FAB.
import { Stack } from 'expo-router';
import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import type { DeclaredAction } from '#primitives/actions/action-list';
import { IconButton } from '#primitives/actions/icon-button';
import { Menu } from '#primitives/overlays/menu';
import { PageActionButton } from './page-action-button.android';
import { headerActions, pageActions } from './page-action-groups';
import { PageFab } from './page-fab.android';
import type { PageProps } from './page-props';

export function PagePhoneHeader(
  props: PageProps & { wide: boolean },
): ReactElement {
  const options = headerOptions(props);

  return (
    <>
      <Stack.Screen options={options} />
      {props.wide ? null : primaryAction(props.primaryAction)}
    </>
  );
}

function primaryAction(
  action: PageProps['primaryAction'],
): ReactElement | null {
  return action ? <PageFab action={action} /> : null;
}

function HeaderActions(props: PageProps): ReactElement {
  const { direct, overflow } = headerActions(
    pageActions(props.actions),
    props.search ? 1 : 2,
  );

  return (
    <View className="flex-row items-center">
      {direct.map(headerButton)}
      {overflowMenu(overflow)}
    </View>
  );
}

function headerButton(action: DeclaredAction): ReactElement {
  return <PageActionButton key={action.id} action={action} />;
}

function overflowMenu(actions: DeclaredAction[]): ReactElement | null {
  if (!actions.length) return null;

  const trigger = moreTrigger();

  return (
    <Menu
      accessibilityLabel="More actions"
      trigger={trigger}
      actions={actions}
    />
  );
}

function moreTrigger(): ReactElement {
  return (
    <IconButton
      icon={{ sf: 'ellipsis', material: 'more_vert' }}
      accessibilityLabel="More actions"
      variant="ghost"
    />
  );
}

function searchOptions(
  search: PageProps['search'],
): ComponentProps<typeof Stack.SearchBar> | undefined {
  if (!search) return undefined;

  return {
    placeholder: search.label,
    autoCapitalize: 'none',
    onChangeText: (event) => search.onChangeText?.(event.nativeEvent.text),
    onClose: () => search.onChangeText?.(''),
  };
}

function headerOptions(
  props: PageProps & { wide: boolean },
): React.ComponentProps<typeof Stack.Screen>['options'] {
  return {
    title: props.title,
    headerShown: !props.wide,
    headerTitleAlign: 'left',
    headerRight: (): ReactElement => <HeaderActions {...props} />,
    headerSearchBarOptions: searchOptions(props.search),
  } as const;
}
