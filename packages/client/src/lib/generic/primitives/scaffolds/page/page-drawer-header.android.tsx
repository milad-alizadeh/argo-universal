/*
 * At a narrow Android drawer root the drawer draws the one top app bar, with its stock ☰ and title, as a leading item
 * in a native-stack header drops the native title; the Page hands the drawer its title, Actions and search.
 */
import { useFocusEffect, useNavigation } from 'expo-router';
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
import type { HeaderActionsProps } from '#primitives/actions/action-list';
import { headerClaims } from './page-header-host';
import { headerOptions } from './page-header-items.android';
import type { PageHeaderInput } from './page-props';
import { usePageSearchBar } from './use-page-search-bar';

// What useNavigation returns by default: a stack screen's navigation, whose state may be unset.
type PageNavigation = Omit<NavigationProp<ParamListBase>, 'getState'> & {
  getState: () => NavigationState | undefined;
};

type DrawerHeader = Pick<
  DrawerNavigationOptions,
  'headerTitle' | 'headerRight' | 'headerSearchBarOptions'
>;

type DrawerSearch = DrawerHeader['headerSearchBarOptions'];

// A string `headerTitle` keeps the stock title over the drawer's own `title`, which shows again once the Page is gone.
const released: DrawerHeader = {
  headerTitle: undefined,
  headerRight: undefined,
  headerSearchBarOptions: undefined,
};

export function PageDrawerHeader(props: PageHeaderInput): ReactElement {
  return props.search ? (
    <SearchingDrawerHeader {...props} />
  ) : (
    <PlainDrawerHeader {...props} />
  );
}

function PlainDrawerHeader(props: PageHeaderInput): null {
  const { groups, label } = props.header;
  useDrawerHeader(props.title, { groups, label, slots: 2 });

  return null;
}

// The header's own search icon comes last and takes one of its two places; opened, the bar becomes the search field.
function SearchingDrawerHeader(props: PageHeaderInput): null {
  const { groups, label } = props.header;
  const search = drawerSearch(usePageSearchBar(props));
  useDrawerHeader(props.title, { groups, label, slots: 1 }, search);

  return null;
}

type PageSearch = ReturnType<typeof usePageSearchBar>;

// The header's search bar takes the stack bar's text, focus and close; it closes with its own ✕, with no Cancel button.
function drawerSearch(bar: PageSearch): DrawerSearch {
  const { ref, placeholder, onChangeText, onClose, onFocus, onBlur } = bar;

  return {
    ref,
    placeholder,
    onChangeText,
    onClose,
    onFocus,
    onBlur,
    autoCapitalize: 'none',
  };
}

const claims = headerClaims();

/*
 * The drawer is the parent of the Page's stack; its header takes the options set on its route. Every Plugin nav item
 * shares that route and stack, so a Page mounted behind the focused one never writes it: `useFocusEffect` writes the
 * header on focus, and when the Page's header changes while focused, and gives it back on blur or unmount.
 */
function useDrawerHeader(
  title: string,
  actions: HeaderActionsProps,
  search?: DrawerSearch,
): void {
  const navigation = useNavigation<PageNavigation>();

  const header = {
    headerTitle: title,
    ...headerOptions(actions),
    headerSearchBarOptions: search,
  };

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
