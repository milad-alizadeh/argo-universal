import {
  parseScreenLink,
  type ScreenDestination,
  type ScreenLinkParse,
} from '@repo/contracts/navigation';
import type { Href } from 'expo-router';

export type OpenLinkOutcome =
  | { status: 'loading' }
  | { status: 'open'; href: Href }
  | { status: 'refused'; message: string };

export interface OpenLinkFacts {
  // The Screen link as the system hands it over (`argo://open/...`) or as the App's `/open` path.
  link: string;
  // The link carried a query the route has no use for.
  stray: boolean;
  // The connected Server's id, once it has answered.
  serverId: string | undefined;
  // The connected Server's Projects, once they have arrived.
  projects: readonly { id: string; name: string }[] | undefined;
}

const refused = (message: string): OpenLinkOutcome => ({
  status: 'refused',
  message,
});

const loading: OpenLinkOutcome = { status: 'loading' };

const malformed = refused('That link is not one Argo can open.');

const open = (href: Href): OpenLinkOutcome => ({ status: 'open', href });

type Destination<Screen extends ScreenDestination['screen']> = Extract<
  ScreenDestination,
  { screen: Screen }
>;

const listHrefs = {
  sessions: '/sessions',
  agents: '/settings/agents',
  settings: '/settings',
} satisfies Record<string, Href>;

const pluginHref = ({ pluginId, navId, page }: Destination<'plugin'>): Href =>
  `/plugins/${[pluginId, navId, ...page].map(encodeURIComponent).join('/')}`;

const screenHref = (
  destination: Exclude<ScreenDestination, Destination<'plugin' | 'project'>>,
): Href =>
  destination.screen === 'session'
    ? { pathname: '/sessions/[id]', params: { id: destination.sessionId } }
    : listHrefs[destination.screen];

type Projects = NonNullable<OpenLinkFacts['projects']>;

function foundProject(projectId: string, projects: Projects): OpenLinkOutcome {
  const project = projects.find(({ id }) => id === projectId);

  return project
    ? open({
        pathname: '/settings/projects/[name]',
        params: { name: project.name, projectId },
      })
    : refused('That Project is not on this Server.');
}

const hrefOf = (
  destination: Exclude<ScreenDestination, Destination<'project'>>,
): Href =>
  destination.screen === 'plugin'
    ? pluginHref(destination)
    : screenHref(destination);

const projectOutcome = (
  projectId: string,
  projects: Projects | undefined,
): OpenLinkOutcome => (projects ? foundProject(projectId, projects) : loading);

function destinationOutcome(
  destination: ScreenDestination,
  projects: Projects | undefined,
): OpenLinkOutcome {
  if (destination.screen === 'project')
    return projectOutcome(destination.projectId, projects);

  return open(hrefOf(destination));
}

type ReadLink = Extract<ScreenLinkParse, { ok: true }>;

function forThisServer(link: ReadLink, facts: OpenLinkFacts): OpenLinkOutcome {
  if (facts.serverId === undefined) return loading;

  return link.serverId === facts.serverId
    ? destinationOutcome(link.destination, facts.projects)
    : refused('That link is for another Server.');
}

// The `/open` route's catch-all segments as the path they name.
export const openRoutePath = (segments: readonly string[]): string =>
  `/open/${segments.map(encodeURIComponent).join('/')}`;

const linkOf = ({ link, stray }: OpenLinkFacts): ScreenLinkParse =>
  stray
    ? { ok: false, reason: 'A query is no part of a Screen link' }
    : parseScreenLink(link);

/*
 * What a Screen link does in this App: the Expo route it opens, or why it is refused. The one resolver every
 * platform's `argo://` link and the web `/open` entry go through. A link only navigates, and a link for
 * another Server is refused, never resolved against this one.
 */
export function openLinkOutcome(facts: OpenLinkFacts): OpenLinkOutcome {
  const link = linkOf(facts);

  return link.ok ? forThisServer(link, facts) : malformed;
}
