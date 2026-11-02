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

const belowKey = (name: string): string => `${name}-below`;

const rootBelow = (page: Route, root: readonly string[]): Route => ({
  key: belowKey(page.name),
  name: page.name,
  params: { path: root },
});

export interface PageAt {
  path: readonly string[];
  root: readonly string[];
  wide: boolean;
}

/*
 * A Plugin page opened by its address is the whole stack: every Plugin route is `[...path]`, so there is no `index`
 * root below it. Under wide the root is the list to go back to, so it is put below the page, only while that page is
 * still the one route, so a reset made once the Server's list arrives never puts back a page that was left. On a wide
 * window the list sits beside the page and nothing is pushed, so the root put below on a narrower one comes back out.
 */
export function repairedPluginRoutes(
  { routes }: Pick<Stack, 'routes'>,
  pageKey: string,
  { path, root, wide }: PageAt,
): Stack['routes'] | undefined {
  if (wide) {
    const [first, ...rest] = routes;

    return first?.key === belowKey(first?.name ?? '') && rest.length > 0
      ? rest
      : undefined;
  }

  const page = soleRoute(routes, pageKey);

  return page && sits(path, root) ? [rootBelow(page, root), page] : undefined;
}
