import type { FixtureAnswer } from '@argo/plugin-kit/testing';
import type {
  FixtureCheck,
  FixturePull,
  GitHubFixture,
} from './github-fixture';

export type Held = Pick<
  GitHubFixture,
  | 'pulls'
  | 'files'
  | 'accepted'
  | 'parents'
  | 'failWith'
  | 'checks'
  | 'checksFailWith'
>;

const notFound = 404;

export const refusal = (message: string, status: number): FixtureAnswer => ({
  status,
  json: { message },
});

export const pullPath = /^\/repos\/([^/]+\/[^/]+)\/pulls\/(\d+)$/;

function pullAnswer({ pulls }: Held, path: string): FixtureAnswer {
  const [, repository, number] = pullPath.exec(path) ?? [];
  const pull = pulls.get(`${repository}#${number}`);

  return pull ? { json: pull } : refusal('Not Found', notFound);
}

export const filesPath =
  /^\/repos\/([^/]+\/[^/]+)\/pulls\/(\d+)\/files(?:\?(.*))?$/;

// GitHub's pages of a pull request's files; `per_page` and `page` choose the slice, and no files are an empty page.
const defaultPageSize = 30;

const intParam = (
  params: URLSearchParams,
  key: string,
  fallback: number,
): number => Number(params.get(key) ?? fallback);

function filesAnswer(
  { files }: Held,
  [, repository, number, query]: RegExpExecArray,
): FixtureAnswer {
  const params = new URLSearchParams(query);
  const size = intParam(params, 'per_page', defaultPageSize);
  const page = intParam(params, 'page', 1);
  const all = files.get(`${repository}#${number}`) ?? [];

  return { json: all.slice((page - 1) * size, page * size) };
}

export const checksPath =
  /^\/repos\/([^/]+\/[^/]+)\/commits\/([0-9a-f]+)\/check-runs(\?.*)?$/;

const runsOf = (
  { checks }: Held,
  repository: string | undefined,
  head: string | undefined,
): FixtureCheck[] => checks.get(`${repository}@${head}`) ?? [];

function checksAnswer(held: Held, path: string): FixtureAnswer {
  const [, repository, head] = checksPath.exec(path) ?? [];
  const status = held.checksFailWith.get(`${repository}@${head}`);
  const runs = runsOf(held, repository, head);

  return status
    ? refusal('Server Error', status)
    : { json: { total_count: runs.length, check_runs: runs } };
}

export const listPath = /^\/repos\/([^/]+\/[^/?]+)\/pulls\?(.*)$/;

const repoPath = /^\/repos\/([^/?]+\/[^/?]+)$/;

/*
 * GitHub's list of a repository's pull requests with the branch asked for, by `state` (open unless asked). It
 * deliberately ignores the owner in `head=owner:branch`, so the Plugin must tell a fork's same-named branch apart itself.
 */
function listAnswer(
  { pulls }: Held,
  repository: string,
  query: string,
): FixtureAnswer {
  const params = new URLSearchParams(query);
  const state = params.get('state') ?? 'open';
  const branch = (params.get('head') ?? '').split(':').slice(1).join(':');

  const wanted = (pull: FixturePull): boolean =>
    inState(pull, state) &&
    pull.base.repo.full_name === repository &&
    pull.head.ref === branch;

  return { json: [...pulls.values()].filter(wanted) };
}

const inState = ({ state }: FixturePull, wanted: string): boolean =>
  wanted === 'all' || state === wanted;

const hasPulls = ({ pulls }: Held, repository: string): boolean =>
  [...pulls.values()].some(({ base }) => base.repo.full_name === repository);

const inFamily = ({ parents }: Held, repository: string): boolean =>
  parents.has(repository) || [...parents.values()].includes(repository);

const known = (held: Held, repository: string): boolean =>
  hasPulls(held, repository) || inFamily(held, repository);

function repoAnswer(held: Held, repository: string): FixtureAnswer {
  if (!known(held, repository)) return refusal('Not Found', notFound);

  const parent = held.parents.get(repository);

  return {
    json: {
      full_name: repository,
      parent: parent ? { full_name: parent } : null,
    },
  };
}

const pullOrChecks = (held: Held, path: string): FixtureAnswer =>
  checksPath.test(path) ? checksAnswer(held, path) : pullAnswer(held, path);

type Route = [RegExp, (held: Held, match: RegExpExecArray) => FixtureAnswer];

const routes: Route[] = [
  [filesPath, filesAnswer],
  [
    listPath,
    (held, match) => listAnswer(held, String(match[1]), String(match[2])),
  ],
  [repoPath, (held, match) => repoAnswer(held, String(match[1]))],
];

function route(held: Held, path: string): FixtureAnswer {
  for (const [pattern, answer] of routes) {
    const match = pattern.exec(path);

    if (match) return answer(held, match);
  }

  return pullOrChecks(held, path);
}

// The repository endpoints of `api.github.com`; while `failWith` is set, each one fails with that status.
export function rest(held: Held, path: string): FixtureAnswer {
  if (held.failWith.status)
    return refusal('Server Error', held.failWith.status);

  return route(held, path);
}
