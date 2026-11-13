import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
  type FixtureServices,
} from '@argo/plugin-kit/testing';

// One pull request as GitHub's REST API answers it, with the fields the Plugin reads.
export type FixturePull = {
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged: boolean;
  draft: boolean;
  mergeable_state: string;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
  head: { ref: string; sha: string };
  base: { ref: string; repo: { full_name: string } };
};

// One Check run of a commit as GitHub's REST API answers it.
export type FixtureCheck = {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion:
    | 'success'
    | 'failure'
    | 'neutral'
    | 'skipped'
    | 'cancelled'
    | null;
};

export type GitHubFixture = FixtureServices & {
  // The pull requests GitHub knows, by `owner/repository#number`.
  pulls: Map<string, FixturePull>;
  // The Check runs of a commit, by `owner/repository@sha`; a commit with none listed has none.
  checks: Map<string, FixtureCheck[]>;
  // While set, every call to the API fails with this status, as a network outage or a server error would.
  outage: { status: number | undefined };
  // The same for the Checks endpoint alone.
  checksOutage: { status: number | undefined };
  // Every token GitHub accepts; empty means every call is a 401.
  accepted: Set<string>;
  pullReads: () => FixtureRequest[];
  checkReads: () => FixtureRequest[];
};

export const sha = '0123456789abcdef0123456789abcdef01234567';

type Names = Pick<
  FixturePull,
  'number' | 'title' | 'html_url' | 'head' | 'base'
>;

const namesOf = (repository: string, number: number): Names => ({
  number,
  title: `Pull request ${number}`,
  html_url: `https://github.com/${repository}/pull/${number}`,
  head: { ref: `feature-${number}`, sha },
  base: { ref: 'main', repo: { full_name: repository } },
});

const factsOf = (): Omit<FixturePull, keyof Names> => ({
  state: 'open',
  merged: false,
  draft: false,
  mergeable_state: 'clean',
  additions: 10,
  deletions: 2,
  changed_files: 3,
});

// A pull request keyed as the fixture holds it; `changes` overrides what GitHub would say.
export const pullOf = (
  repository: string,
  number: number,
  changes: Partial<FixturePull> = {},
): [string, FixturePull] => [
  `${repository}#${number}`,
  { ...namesOf(repository, number), ...factsOf(), ...changes },
];

const unauthorized = 401;

const notFound = 404;

const refusal = (message: string, status: number): FixtureAnswer => ({
  status,
  json: { message },
});

const deviceCode = (): FixtureAnswer => ({
  json: {
    device_code: 'device-1',
    user_code: 'WDJB-MJHT',
    verification_uri: 'https://github.com/login/device',
    expires_in: 900,
    interval: 1,
  },
});

const bearerOf = ({ headers }: Pick<FixtureRequest, 'headers'>): string =>
  String(headers.authorization).replace(/^Bearer /, '');

const pullPath = /^\/repos\/([^/]+\/[^/]+)\/pulls\/(\d+)$/;

const checksPath =
  /^\/repos\/([^/]+\/[^/]+)\/commits\/([0-9a-f]+)\/check-runs(\?.*)?$/;

type Held = Pick<
  GitHubFixture,
  'pulls' | 'checks' | 'accepted' | 'outage' | 'checksOutage'
>;

function checksAnswer({ checks }: Held, path: string): FixtureAnswer {
  const [, repository, head] = checksPath.exec(path) ?? [];
  const runs = checks.get(`${repository}@${head}`) ?? [];

  return { json: { total_count: runs.length, check_runs: runs } };
}

function pullAnswer({ pulls }: Held, path: string): FixtureAnswer {
  const [, repository, number] = pullPath.exec(path) ?? [];
  const pull = pulls.get(`${repository}#${number}`);

  return pull ? { json: pull } : refusal('Not Found', notFound);
}

// The status an outage fails a call with, if one is on.
const outageOf = (held: Held, path: string): number | undefined =>
  held.outage.status ??
  (checksPath.test(path) ? held.checksOutage.status : undefined);

function resource(held: Held, { path }: FixtureRequest): FixtureAnswer {
  if (path === '/user') return { json: { login: 'octocat' } };

  return checksPath.test(path)
    ? checksAnswer(held, path)
    : pullAnswer(held, path);
}

function api(held: Held, request: FixtureRequest): FixtureAnswer {
  if (!held.accepted.has(bearerOf(request)))
    return refusal('Bad credentials', unauthorized);

  const outage = outageOf(held, request.path);

  return outage === undefined
    ? resource(held, request)
    : refusal('Service Unavailable', outage);
}

const githubCom = (request: FixtureRequest): FixtureAnswer =>
  request.path === '/login/device/code'
    ? deviceCode()
    : { json: { access_token: 'token-1' } };

const handle =
  (held: Held) =>
  (request: FixtureRequest): FixtureAnswer =>
    request.host === 'github.com' ? githubCom(request) : api(held, request);

/*
 * GitHub as the Plugin meets it: the device-flow endpoints on `github.com`, and the user and pull request endpoints on
 * `api.github.com`. A call with a token it does not accept is a 401.
 */
export async function githubFixture(): Promise<GitHubFixture> {
  const held = heldState();
  const services = await fixtureServices(handle(held));

  return {
    ...services,
    ...held,
    pullReads: () =>
      services.requests.filter(({ path }) => pullPath.test(path)),
    checkReads: () =>
      services.requests.filter(({ path }) => checksPath.test(path)),
  };
}

const heldState = (): Held => ({
  pulls: new Map(),
  checks: new Map(),
  accepted: new Set(['token-1']),
  outage: { status: undefined },
  checksOutage: { status: undefined },
});
