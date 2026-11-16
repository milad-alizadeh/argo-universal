import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
  type FixtureServices,
} from '@argo/plugin-kit/testing';
import type { AtlassianOAuth } from './atlassian-oauth';
import { jiraData, type JiraData } from './jira-data';
import { notFound, routed, type Routed, type Routing } from './jira-gateway';
import { jiraRoutes, type JiraRoute } from './jira-routes';

/*
 * Jira Cloud as the Plugin meets it, for its tests: Atlassian's gateway at `api.atlassian.com/ex/jira/<cloudId>`, which
 * takes a scoped token as Basic auth, each site's own API at `<site>.atlassian.net`, which takes only an unscoped one,
 * the site's public tenant info, and, given `oauth`, Atlassian's OAuth endpoints, whose tokens the gateway takes as
 * Bearer. Every call the Plugin makes reaches one handler over a certificate the test trusts.
 *
 * Extend it with a route (`jira-routes.ts`): a name, a method, a pattern over the path after `/rest/api/3`, and an
 * answer; pass more as `routes`. A test can make any named route, or `tenant`, fail with `fail(name, answer)`.
 */
export type JiraService = Pick<FixtureServices, 'network' | 'requests'> & {
  data: JiraData;
  // Answers every call to a named route with this until `heal(name)`.
  fail: (name: string, answer: FixtureAnswer) => void;
  heal: (name: string) => void;
  // Holds every call to a named route unanswered, as a slow Jira does, until the function it answers lets them go.
  hold: (name: string) => () => void;
  // The calls that reached a named route, in order.
  calls: (name: string) => FixtureRequest[];
};

type Service = Routing & {
  failing: Map<string, FixtureAnswer>;
  held: Map<string, Promise<void>>;
  names: WeakMap<FixtureRequest, string>;
};

const tenantPath = '/_edge/tenant_info';

function tenantInfo(data: JiraData, host: string): FixtureAnswer {
  const site = data.sites.find((each) => each.host === host);

  return site ? { json: { cloudId: site.cloudId } } : notFound('Site');
}

const tenant = (data: JiraData, { host }: FixtureRequest): Routed => ({
  name: 'tenant',
  answer: () => tenantInfo(data, host),
});

const now = (service: Service, found: Routed): FixtureAnswer =>
  service.failing.get(found.name) ?? found.answer();

// A held route answers once it is let go, from the data as it is then.
function reply(
  service: Service,
  found: Routed,
): FixtureAnswer | Promise<FixtureAnswer> {
  const held = service.held.get(found.name);

  return held ? held.then(() => now(service, found)) : now(service, found);
}

type Answer = FixtureAnswer | Promise<FixtureAnswer>;

// Atlassian's OAuth endpoints, when the test gave them, answer before Jira does.
const signingIn = (
  { oauth }: Service,
  request: FixtureRequest,
): FixtureAnswer | null => (oauth ? oauth.answer(request) : null);

const answer = (service: Service, request: FixtureRequest): Answer =>
  signingIn(service, request) ?? jiraAnswer(service, request);

function jiraAnswer(service: Service, request: FixtureRequest): Answer {
  const found =
    request.path === tenantPath
      ? tenant(service.data, request)
      : routed(service, request);

  if (!('name' in found)) return found;

  service.names.set(request, found.name);

  return reply(service, found);
}

// `oauth` stands in for Atlassian's OAuth endpoints, for a test that signs in with Atlassian.
type Options = {
  data?: JiraData;
  routes?: JiraRoute[];
  oauth?: AtlassianOAuth | null;
};

const serviceOf = (
  options: Omit<Options, 'oauth'>,
): Omit<Service, 'oauth'> => ({
  data: options.data ?? jiraData(),
  routes: [...(options.routes ?? []), ...jiraRoutes],
  failing: new Map(),
  held: new Map(),
  names: new WeakMap(),
});

function hold(service: Service, name: string): () => void {
  const { promise, resolve } = Promise.withResolvers<void>();

  service.held.set(name, promise);

  return () => {
    service.held.delete(name);
    resolve();
  };
}

const controls = (
  service: Service,
  { network, requests }: FixtureServices,
): JiraService => ({
  network,
  requests,
  data: service.data,
  fail: (name, failure) => void service.failing.set(name, failure),
  heal: (name) => void service.failing.delete(name),
  hold: (name) => hold(service, name),
  calls: (name) =>
    requests.filter((request) => service.names.get(request) === name),
});

export async function jiraService({
  oauth = null,
  ...options
}: Options = {}): Promise<JiraService> {
  const service = { ...serviceOf(options), oauth };
  const services = await fixtureServices((request) => answer(service, request));

  return controls(service, services);
}
