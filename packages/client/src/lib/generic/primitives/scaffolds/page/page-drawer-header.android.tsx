/*
 * At a narrow Android drawer root the drawer draws the header, with its stock ☰ and title, as a leading item in a
 * native-stack header drops the native title; the Page hands the drawer its title and Actions.
 */
import { Stack, useFocusEffect, useNavigation } from 'expo-router';
import type {
  DrawerNavigationOptions,
  DrawerNavigationProp,
} from 'expo-router/drawer';
import type {
  NavigationProp,
  NavigationState,
  ParamListBase,
} from 'expo-router/react-navigation';
import type { ReactElement } from 'react';
import {
  ActionListHeaderContext,
  type HeaderActionsProps,
} from '#primitives/actions/action-list';
import { headerClaims } from './page-header-host';
import { headerOptions, pageTitleOptions } from './page-header-items.android';
import type { PageProps } from './page-props';
import { PageSearchBar } from './page-search-bar.android';
import { usePageActions } from './use-page-actions';

// What useNavigation returns by default: a stack screen's navigation, whose state may be unset.
type PageNavigation = Omit<NavigationProp<ParamListBase>, 'getState'> & {
  getState: () => NavigationState | undefined;
};

type DrawerHeader = Pick<
  DrawerNavigationOptions,
  'headerTitle' | 'headerRight'
>;

// A string `headerTitle` keeps the stock title over the drawer's own `title`, which shows again once the Page is gone.
const released: DrawerHeader = {
  headerTitle: undefined,
  headerRight: undefined,
};

export function PageDrawerHeader(props: PageProps): ReactElement {
  const { register, ...actions } = usePageActions();

  // The search icon is on the stack's header, so the drawer's has both of its places for Actions.
  useDrawerHeader(props.title, { ...actions, slots: 2 });

  return (
    <ActionListHeaderContext value={register}>
      {props.actions}
      {props.search ? <StackSearch {...props} /> : null}
    </ActionListHeaderContext>
  );
}

// Android's search stays the stack's own bar, which shows the stack's header, titled, under the drawer's.
function StackSearch(props: PageProps): ReactElement {
  return (
    <>
      <Stack.Screen options={{ ...pageTitleOptions, title: props.title }} />
      <PageSearchBar {...props} />
    </>
  );
}

const claims = headerClaims();

/*
 * The drawer is the parent of the Page's stack; its header takes the options set on its route. Every Plugin nav item
 * shares that route and stack, so a Page mounted behind the focused one never writes it: `useFocusEffect` writes the
 * header on focus, and when the Page's header changes while focused, and gives it back on blur or unmount.
 */
function useDrawerHeader(title: string, actions: HeaderActionsProps): void {
  const navigation = useNavigation<PageNavigation>();
  const header = { headerTitle: title, ...headerOptions(actions) };

  useFocusEffect(() => holdDrawerHeader(navigation, header));
}

// The Page gives the header back only while it still holds it, as the arriving Page may have written its own first.
function holdDrawerHeader(
  navigation: PageNavigation,
  header: DrawerHeader,
): () => void {
  const drawer = navigation.getParent<DrawerNavigationProp<ParamListBase>>();
  const route = drawerRoute(navigation);
  const page = Symbol(route);
  claims.claim(route, page);
  drawer?.setOptions(header);

  return (): void => {
    if (claims.release(route, page)) drawer?.setOptions(released);
  };
}

// The stack's key names the drawer route it fills, so routes keep their holders apart.
const drawerRoute = (navigation: PageNavigation): string =>
  navigation.getState()?.key ?? '';
