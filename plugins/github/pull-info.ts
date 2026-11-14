import { count, text, valueAt, type Json } from './json';

// What the Plugin keeps of a pull request GitHub described; JSON all through, so a Query can hold it.
export type PullInfo = {
  repository: string;
  number: number;
  title: string;
  stage: 'open' | 'merged' | 'closed';
  draft: boolean;
  conflict: boolean;
  url: string;
  branch: string;
  // The repository the branch is in; a fork's, for a pull request from a fork. Absent when GitHub no longer names it.
  headRepository?: string;
  base: string;
  head: string;
  files: number;
  additions: number;
  deletions: number;
};

const invalid = 'GitHub returned an invalid pull request.';

const stageOf = (pull: Json): PullInfo['stage'] => {
  if (valueAt(pull, ['merged']) === true) return 'merged';

  return valueAt(pull, ['state']) === 'closed' ? 'closed' : 'open';
};

// GitHub names a merge conflict `dirty`; `unknown` while it still works the state out.
const conflicts = (pull: Json): boolean =>
  valueAt(pull, ['mergeable_state']) === 'dirty';

function numberOf(pull: Json): number {
  const value = valueAt(pull, ['number']);

  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;

  throw new Error(invalid);
}

// A fork that was deleted leaves the pull request with no head repository, which is told, not guessed.
const headRepositoryOf = (pull: Json): Pick<PullInfo, 'headRepository'> => {
  const name = valueAt(pull, ['head', 'repo', 'full_name']);

  return typeof name === 'string' && name !== ''
    ? { headRepository: name }
    : {};
};

// The names and numbers GitHub gives a pull request.
const facts = (pull: Json): Omit<PullInfo, 'stage' | 'draft' | 'conflict'> => ({
  ...headRepositoryOf(pull),
  repository: text(pull, invalid, 'base', 'repo', 'full_name'),
  number: numberOf(pull),
  title: text(pull, invalid, 'title'),
  url: text(pull, invalid, 'html_url'),
  branch: text(pull, invalid, 'head', 'ref'),
  base: text(pull, invalid, 'base', 'ref'),
  head: text(pull, invalid, 'head', 'sha'),
  files: count(pull, invalid, 'changed_files'),
  additions: count(pull, invalid, 'additions'),
  deletions: count(pull, invalid, 'deletions'),
});

// The pull request out of GitHub's reply; anything that is not one is refused, never guessed at.
export function parsePull(body: string): PullInfo {
  const pull: Json = JSON.parse(body);

  return {
    ...facts(pull),
    stage: stageOf(pull),
    draft: valueAt(pull, ['draft']) === true,
    conflict: conflicts(pull),
  };
}
