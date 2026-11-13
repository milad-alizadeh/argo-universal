import type { FixtureAnswer } from '@argo/plugin-kit/testing';
import type {
  FixtureCheck,
  FixturePull,
  GitHubFixture,
} from './github-fixture';

export type Held = Pick<
  GitHubFixture,
  'pulls' | 'accepted' | 'parents' | 'failWith' | 'checks' | 'checksFailWith'
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

export const checksPath =
  /^\/repos\/([^/]+\/[^/]+)\/commits\/([0-9a-f]+)\/check-runs(\?.*)?$/;

const runsOf = (
  { checks }: Held,
  repository: string | undefined,
  head: string | undefined,
): FixtureCheck[] => checks.get(`${repository}@${head}`) ?? [];

function checksAnswer(held: Held, path: string): FixtureAnswer {
  const [, repository, head] = checksPath.exec(path) ?? [];
  const { status } = held.checksFailWith;
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

function route(held: Held, path: string): FixtureAnswer {
  const listed = listPath.exec(path);

  if (listed) return listAnswer(held, String(listed[1]), String(listed[2]));

  const repo = repoPath.exec(path);

  return repo ? repoAnswer(held, String(repo[1])) : pullOrChecks(held, path);
}

// The repository endpoints of `api.github.com`; while `failWith` is set, each one fails with that status.
export function rest(held: Held, path: string): FixtureAnswer {
  if (held.failWith.status)
    return refusal('Server Error', held.failWith.status);

  return route(held, path);
}
