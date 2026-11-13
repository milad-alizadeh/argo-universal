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
  head: { ref: string; sha: string; repo: { full_name: string } };
  base: { ref: string; repo: { full_name: string } };
};

export type GitHubFixture = FixtureServices & {
  // The pull requests GitHub knows, by `owner/repository#number`.
  pulls: Map<string, FixturePull>;
  // Every token GitHub accepts; empty means every call is a 401.
  accepted: Set<string>;
  // The repository each fork was made from, by `owner/repository`.
  parents: Map<string, string>;
  // Calls asking which pull requests a branch has.
  listReads: () => FixtureRequest[];
  pullReads: () => FixtureRequest[];
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
  head: { ref: `feature-${number}`, sha, repo: { full_name: repository } },
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

// The head of a pull request proposed from `owner`'s fork of the repository.
export const headFrom = (owner: string, ref: string): FixturePull['head'] => ({
  ref,
  sha,
  repo: { full_name: `${owner}/repository` },
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

type Held = Pick<GitHubFixture, 'pulls' | 'accepted' | 'parents'>;

function pullAnswer({ pulls }: Held, path: string): FixtureAnswer {
  const [, repository, number] = pullPath.exec(path) ?? [];
  const pull = pulls.get(`${repository}#${number}`);

  return pull ? { json: pull } : refusal('Not Found', notFound);
}

const listPath = /^\/repos\/([^/]+\/[^/?]+)\/pulls\?(.*)$/;

const repoPath = /^\/repos\/([^/?]+\/[^/?]+)$/;

const ownerOf = (repository: string): string => repository.split('/')[0] ?? '';

// GitHub's list of a repository's pull requests, narrowed by `head=owner:branch` as the real one is.
function listAnswer(
  { pulls }: Held,
  repository: string,
  query: string,
): FixtureAnswer {
  const [owner = '', ...branch] = (
    new URLSearchParams(query).get('head') ?? ''
  ).split(':');

  const wanted = (pull: FixturePull): boolean =>
    pull.base.repo.full_name === repository &&
    pull.head.ref === branch.join(':') &&
    ownerOf(pull.head.repo.full_name) === owner;

  return { json: [...pulls.values()].filter(wanted) };
}

function repoAnswer({ parents }: Held, repository: string): FixtureAnswer {
  const parent = parents.get(repository);

  return {
    json: {
      full_name: repository,
      parent: parent ? { full_name: parent } : null,
    },
  };
}

function route(held: Held, path: string): FixtureAnswer {
  const listed = listPath.exec(path);

  if (listed) return listAnswer(held, String(listed[1]), String(listed[2]));

  const repo = repoPath.exec(path);

  return repo ? repoAnswer(held, String(repo[1])) : pullAnswer(held, path);
}

function api(held: Held, request: FixtureRequest): FixtureAnswer {
  if (!held.accepted.has(bearerOf(request)))
    return refusal('Bad credentials', unauthorized);

  return request.path === '/user'
    ? { json: { login: 'octocat' } }
    : route(held, request.path);
}

const githubCom = (request: FixtureRequest): FixtureAnswer =>
  request.path === '/login/device/code'
    ? deviceCode()
    : { json: { access_token: 'token-1' } };

const handle =
  (held: Held) =>
  (request: FixtureRequest): FixtureAnswer =>
    request.host === 'github.com' ? githubCom(request) : api(held, request);

const heldOf = (): Held => ({
  pulls: new Map(),
  accepted: new Set(['token-1']),
  parents: new Map(),
});

/*
 * GitHub as the Plugin meets it: the device-flow endpoints on `github.com`, and the user and pull request endpoints on
 * `api.github.com`. A call with a token it does not accept is a 401.
 */
export async function githubFixture(): Promise<GitHubFixture> {
  const held = heldOf();
  const services = await fixtureServices(handle(held));

  const reads = (path: RegExp) => (): FixtureRequest[] =>
    services.requests.filter((request) => path.test(request.path));

  return {
    ...services,
    ...held,
    listReads: reads(listPath),
    pullReads: reads(pullPath),
  };
}
