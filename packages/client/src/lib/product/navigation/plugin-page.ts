import { router } from 'expo-router';

/*
 * What a page opens for: the Session behind a Session header action, or the Project behind a Project details row
 * (ADR-0046). It rides in the route's params, so the page's view names it to the Plugin.
 */
export interface PluginOpening {
  sessionId?: string;
  projectId?: string;
}

type RouteParams = {
  path: string[];
  sessionId?: string;
  projectId?: string;
};

function routeParams(
  route: string[],
  { sessionId, projectId }: PluginOpening,
): RouteParams {
  const params: RouteParams = { path: route };

  if (sessionId !== undefined) params.sessionId = sessionId;

  if (projectId !== undefined) params.projectId = projectId;

  return params;
}

// Pushes a Plugin's page route, for what the page opens for.
export const pushPluginPage = (route: string[], opening: PluginOpening): void =>
  router.push({
    pathname: '/plugins/[...path]',
    params: routeParams(route, opening),
  });
