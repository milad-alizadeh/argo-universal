import type {
  NavigationProp,
  ParamListBase,
} from 'expo-router/react-navigation';

type Stack = ReturnType<NavigationProp<ParamListBase>['getState']>;

type Route = Stack['routes'][number];

// The page's own path, the catch-all route's segments, is under the nav item: it starts with the root's and goes further.
const sits = (path: readonly string[], root: readonly string[]): boolean =>
  path.length > root.length &&
  root.every((segment, at) => path[at] === segment);

const soleRoute = (routes: Stack['routes'], key: string): Route | undefined =>
  routes.find((route) => route.key === key && routes.length === 1);

const rootBelow = (page: Route, root: readonly string[]): Route => ({
  key: `${page.name}-below`,
  name: page.name,
  params: { path: root },
});

/*
 * A Plugin page opened by its address is the whole stack: every Plugin route is `[...path]`, so there is no `index`
 * root below it and nothing to go back to. The nav item's root page is put below it, and only while that page is
 * still the one route, so a reset made once the Server's list arrives never puts back a page that was left.
 */
export function repairedPluginRoutes(
  stack: Pick<Stack, 'routes'>,
  pageKey: string,
  { path, root }: { path: readonly string[]; root: readonly string[] },
): Stack['routes'] | undefined {
  const page = soleRoute(stack.routes, pageKey);

  return page && sits(path, root) ? [rootBelow(page, root), page] : undefined;
}
