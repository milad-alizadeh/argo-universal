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

// One pull request as GitHub's REST API answers it, with the fields the Plugin reads.
export type FixturePull = {
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged: boolean;
  draft: boolean;
  mergeable_state: string;
  // GraphQL's id of the pull request, and its auto-merge when GitHub has it turned on.
  node_id: string;
  auto_merge: { merge_method: string } | null;
  html_url: string;
  // Numbers; a test may send anything else to see it refused.
  additions: number | string;
  deletions: number;
  changed_files: number;
  head: { ref: string; sha: string; repo: { full_name: string } };
  base: { ref: string; repo: { full_name: string } };
};

// One changed file as GitHub lists a pull request's files; `patch` is absent for a binary or very large file.
export type FixtureFile = {
  filename: string;
  // GitHub's statuses are added, removed, modified, renamed, copied, changed and unchanged; a test may send any other.
  status: string;
  // A number; a test may send anything else to see it refused.
  additions: number | string;
  deletions: number | string;
  patch?: string;
  previous_filename?: string;
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
  // The Check runs of a commit, by `owner/repository@sha`; a commit with none listed has none.
  checks: Map<string, FixtureCheck[]>;
  // The status the Checks endpoint fails with for a commit, by `owner/repository@sha`; the pull request itself still reads.
  checksFailWith: Map<string, number>;
  // The pull requests GitHub knows, by `owner/repository#number`.
  pulls: Map<string, FixturePull>;
  // The files each pull request changes, by `owner/repository#number`.
  files: Map<string, FixtureFile[]>;
  // Every token GitHub accepts; empty means every call is a 401.
  accepted: Set<string>;
  // Set to make every call to `api.github.com` fail with this status, once signed in.
  failWith: { status: number | null };
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
  'number' | 'title' | 'html_url' | 'head' | 'base' | 'node_id'
>;

const namesOf = (repository: string, number: number): Names => ({
  number,
  node_id: `PR_${repository}#${number}`,
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

function api(held: Held, request: FixtureRequest): FixtureAnswer {
  if (!held.accepted.has(bearerOf(request)))
    return refusal('Bad credentials', unauthorized);

  if (request.path === graphqlPath) return graphqlAnswer(held, request);

  return request.path === '/user'
    ? { json: { login: 'octocat' } }
    : rest(held, request.path);
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
  files: new Map(),
  accepted: new Set(['token-1']),
  parents: new Map(),
  failWith: { status: null },
  checks: new Map(),
  checksFailWith: new Map(),
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
