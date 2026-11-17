import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
  type FixtureServices,
} from '@argo/plugin-kit/testing';
import {
  autoMergeCalls,
  graphqlAnswer,
  graphqlPath,
  type AutoMergeCall,
  type FixtureRepository,
} from './github-fixture-automation';
import {
  filesPath,
  listPath,
  pullPath,
  refusal,
  rest,
  type Held,
  checksPath,
} from './github-fixture-rest';
import type {
  FixtureCheck,
  FixtureComment,
  FixtureFile,
  FixturePull,
} from './github-fixture-types';

export type GitHubFixture = FixtureServices & {
  // The Check runs of a commit, by `owner/repository@sha`; a commit with none listed has none.
  checks: Map<string, FixtureCheck[]>;
  // The status the Checks endpoint fails with for a commit, by `owner/repository@sha`; the pull request itself still reads.
  checksFailWith: Map<string, number>;
  // The review comments of each pull request, by `owner/repository#number`; one with none listed has none.
  comments: Map<string, FixtureComment[]>;
  // The status the review comments endpoint fails with for a pull request, by `owner/repository#number`.
  commentsFailWith: Map<string, number>;
  // The pull requests GitHub knows, by `owner/repository#number`.
  pulls: Map<string, FixturePull>;
  // The files each pull request changes, by `owner/repository#number`.
  files: Map<string, FixtureFile[]>;
  // Every token GitHub accepts; empty means every call is a 401.
  accepted: Set<string>;
  // Set to make every call to `api.github.com` fail with this status, once signed in.
  failWith: { status: number | null };
  // Set to hold every call to `api.github.com` until the promise settles: a GitHub that answers slowly.
  stall: { until: Promise<void> | null };
  // The repository each fork was made from, by `owner/repository`.
  parents: Map<string, string>;
  // The merge settings GitHub reports, by `owner/repository`; one not set allows every method.
  repositories: Map<string, FixtureRepository>;
  // Set to make every GraphQL call fail with this status, once signed in.
  graphqlFailWith: { status: number | null };
  // The auto-merge mutations GitHub received, in order.
  autoMergeCalls: () => AutoMergeCall[];
  // Calls asking which pull requests a branch has.
  listReads: () => FixtureRequest[];
  pullReads: () => FixtureRequest[];
  // Calls listing a pull request's files.
  fileReads: () => FixtureRequest[];
  checkReads: () => FixtureRequest[];
};

export const sha = '0123456789abcdef0123456789abcdef01234567';

type Names = Pick<
  FixturePull,
  'number' | 'title' | 'html_url' | 'head' | 'base' | 'node_id' | 'user'
>;

const namesOf = (repository: string, number: number): Names => ({
  number,
  node_id: `PR_${repository}#${number}`,
  title: `Pull request ${number}`,
  html_url: `https://github.com/${repository}/pull/${number}`,
  head: { ref: `feature-${number}`, sha, repo: { full_name: repository } },
  base: { ref: 'main', repo: { full_name: repository } },
  user: { login: 'octocat' },
});

const factsOf = (): Omit<FixturePull, keyof Names> => ({
  state: 'open',
  merged: false,
  draft: false,
  // Waiting on its Checks, so GitHub queues auto-merge rather than refusing a pull request it could merge now.
  mergeable_state: 'blocked',
  auto_merge: null,
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

const restAnswer = (held: Held, path: string): FixtureAnswer =>
  path === '/user' ? { json: { login: 'octocat' } } : rest(held, path);

async function api(held: Held, call: FixtureRequest): Promise<FixtureAnswer> {
  await held.stall.until;

  if (!held.accepted.has(bearerOf(call)))
    return refusal('Bad credentials', unauthorized);

  if (call.path === graphqlPath) return graphqlAnswer(held, call);

  return restAnswer(held, call.path);
}

const githubCom = (request: FixtureRequest): FixtureAnswer =>
  request.path === '/login/device/code'
    ? deviceCode()
    : { json: { access_token: 'token-1' } };

const handle =
  (held: Held) =>
  (request: FixtureRequest): FixtureAnswer | Promise<FixtureAnswer> =>
    request.host === 'github.com' ? githubCom(request) : api(held, request);

const heldOf = (): Held => ({
  pulls: new Map(),
  files: new Map(),
  accepted: new Set(['token-1']),
  parents: new Map(),
  failWith: { status: null },
  stall: { until: null },
  checks: new Map(),
  checksFailWith: new Map(),
  comments: new Map(),
  commentsFailWith: new Map(),
  repositories: new Map(),
  graphqlFailWith: { status: null },
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
    fileReads: reads(filesPath),
    checkReads: reads(checksPath),
    autoMergeCalls: () => autoMergeCalls(services.requests),
  };
}
