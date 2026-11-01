import type {
  NavigationProp,
  ParamListBase,
} from 'expo-router/react-navigation';

type Stack = ReturnType<NavigationProp<ParamListBase>['getState']>;

type Route = Stack['routes'][number];

// A core section's own `index` root, and a page of another name. A Plugin's root is `[...path]`, as is each page it pushes.
const indexAndPage = (routes: Stack['routes']): routes is [Route, Route] =>
  /^index,(?!index$)[^,]+$/.test(routes.map(({ name }) => name).join(','));

// The page asking is a dynamic one: a list opened over the root, as a wide window does, has no list of its own below it.
const belowsAPage = (
  routes: Stack['routes'],
  pageKey: string,
): routes is [Route, Route] =>
  indexAndPage(routes) &&
  routes[1].key === pageKey &&
  !routes[1].name.endsWith('/index');

/*
 * A page opened by its address is the root and the page, and nothing between. A cold start seeds the root with the
 * page's params; an address delivered to a running App pushes the page over the root the section already has, with none.
 * Either way the root loses the params and the page's list goes between when the stack has it. Only for the page
 * itself: the root below it mounts later, from a stack that may be stale by then.
 */
export function repairedCoreRoutes(
  stack: Pick<Stack, 'routes' | 'routeNames'>,
  pageKey: string,
): Stack['routes'] | undefined {
  const { routes } = stack;

  if (!belowsAPage(routes, pageKey)) return undefined;

  const [root, page] = routes;

  return [{ name: root.name, key: root.key }, ...listBelow(stack, page), page];
}

// The list a dynamic page belongs to, such as `projects/index` for `projects/[name]`, when the stack has it.
function listBelow(
  stack: Pick<Stack, 'routeNames'>,
  page: Route,
): Stack['routes'] {
  const folder = page.name.split('/').slice(0, -1);
  const list = [...folder, 'index'].join('/');

  return folder.length > 0 && stack.routeNames.includes(list)
    ? [{ key: `${list}-below`, name: list }]
    : [];
}
