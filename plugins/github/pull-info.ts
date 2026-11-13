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
  base: string;
  head: string;
  files: number;
  additions: number;
  deletions: number;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

const invalid = 'GitHub returned an invalid pull request.';

const isObject = (value: Json | undefined): value is { [key: string]: Json } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const child = (value: Json | undefined, key: string): Json | undefined =>
  isObject(value) ? value[key] : undefined;

export const valueAt = (
  value: Json,
  path: readonly string[],
): Json | undefined => path.reduce<Json | undefined>(child, value);

const text = (pull: Json, ...path: string[]): string => {
  const value = valueAt(pull, path);

  if (typeof value === 'string' && value !== '') return value;

  throw new Error(invalid);
};

const count = (pull: Json, key: string): number => {
  const value = valueAt(pull, [key]);

  return typeof value === 'number' ? value : 0;
};

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

// The names and numbers GitHub gives a pull request.
const facts = (pull: Json): Omit<PullInfo, 'stage' | 'draft' | 'conflict'> => ({
  repository: text(pull, 'base', 'repo', 'full_name'),
  number: numberOf(pull),
  title: text(pull, 'title'),
  url: text(pull, 'html_url'),
  branch: text(pull, 'head', 'ref'),
  base: text(pull, 'base', 'ref'),
  head: text(pull, 'head', 'sha'),
  files: count(pull, 'changed_files'),
  additions: count(pull, 'additions'),
  deletions: count(pull, 'deletions'),
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
