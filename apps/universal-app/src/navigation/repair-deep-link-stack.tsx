import { useNavigation, useRoute } from 'expo-router';
import {
  CommonActions,
  type NavigationProp,
  type ParamListBase,
} from 'expo-router/react-navigation';
import { useLayoutEffect } from 'react';

/*
 * A page opened by its address has this root added below it so Back has somewhere to go, and the router gives the root
 * the page's params (`name`, `id`). The root has no such param, so its address would show it as a query string. It also
 * skips the page's own list (Projects between Settings and a Project). The stack is reset without the params and with
 * the list in between, once, as the page opens. It is placed in the page's own layout, not in the root: the root below
 * a page mounts later, and a reset made then, from the stack as it was, put back a page that a quick Back had just
 * left. From the page's first commit, the reset is queued before any Back can be.
 */
export function RepairDeepLinkStack(): null {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { key } = useRoute();

  useLayoutEffect(() => {
    const stack = navigation.getState();
    const routes = repairedRoutes(stack, key);

    if (!routes) return;

    navigation.dispatch(
      CommonActions.reset({ ...stack, index: routes.length - 1, routes }),
    );
  }, [navigation, key]);

  return null;
}

type Stack = ReturnType<NavigationProp<ParamListBase>['getState']>;

type Route = Stack['routes'][number];

const hasParams = (route: Route | undefined): boolean =>
  Object.keys({ ...route?.params }).length > 0;

// A core section's own `index` root, and a page of another name. A Plugin's root is `[...path]`, as is each page it pushes.
const indexAndPage = (routes: Stack['routes']): boolean =>
  /^index,(?!index$)[^,]+$/.test(routes.map(({ name }) => name).join(','));

// Only that stack, the root carrying the page's params, is one opened by its address.
const openedByAddress = (routes: Stack['routes']): routes is [Route, Route] =>
  indexAndPage(routes) && hasParams(routes[0]);

// Only for the page itself: the root below it mounts later, from a stack that may be stale by then.
function repairedRoutes(
  stack: Stack,
  pageKey: string,
): Stack['routes'] | undefined {
  const { routes } = stack;

  if (!openedByAddress(routes) || routes[1].key !== pageKey) return undefined;

  const [root, page] = routes;

  return [{ name: root.name, key: root.key }, ...listBelow(stack, page), page];
}

// The list a dynamic page belongs to, such as `projects/index` for `projects/[name]`, when the stack has it.
function listBelow(
  stack: Stack,
  page: Stack['routes'][number],
): Stack['routes'] {
  const folder = page.name.split('/').slice(0, -1);
  const list = [...folder, 'index'].join('/');

  return folder.length > 0 && stack.routeNames.includes(list)
    ? [{ key: `${list}-below`, name: list }]
    : [];
}
