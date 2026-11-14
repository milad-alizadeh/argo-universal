// A pull request named by its repository and number, never by number alone: two repositories share numbers.
export type PullReference = { repository: string; number: number };

const repository = '(?<repository>[\\w.-]+/[\\w.-]+?)';

const number = '(?<number>[1-9]\\d{0,8})';

const written = [
  new RegExp(`^${repository}#${number}$`),
  new RegExp(`^https://github\\.com/${repository}/pull/${number}(?:[/?#].*)?$`),
];

const bare = new RegExp(`^#?${number}$`);

const origins = [
  new RegExp(`^git@github\\.com:${repository}(?:\\.git)?/?$`),
  new RegExp(`^https://github\\.com/${repository}(?:\\.git)?/?$`),
];

type Groups = Readonly<Record<string, string>>;

const firstGroups = (
  patterns: readonly RegExp[],
  text: string,
): Groups | undefined =>
  patterns.map((pattern) => pattern.exec(text)?.groups).find(Boolean);

const referenceOf = (groups: Groups): PullReference => ({
  repository: String(groups.repository),
  number: Number(groups.number),
});

const trimmed = (text: string | null): string => (text ?? '').trim();

const bareGroups = (text: string): Groups | undefined =>
  bare.exec(text)?.groups;

// `owner/name` of a Project's GitHub origin, or null for a Project with another host or none.
export const repositoryOfOrigin = (originUrl: string | null): string | null =>
  firstGroups(origins, trimmed(originUrl))?.repository ?? null;

const inOwnRepository = (
  text: string,
  originUrl: string | null,
): PullReference | undefined => {
  const own = repositoryOfOrigin(originUrl);
  const found = bareGroups(text);

  return own && found ? referenceOf({ ...found, repository: own }) : undefined;
};

const refusal = (text: string): Error =>
  new Error(
    `"${text}" is not a pull request: use owner/repo#123, its GitHub URL, or its number in this Project's GitHub repository.`,
  );

/*
 * The pull request a reference names: `owner/name#12`, its GitHub URL, or a bare number in the Project's own
 * repository. Anything else is refused rather than guessed.
 */
export function parseReference(
  text: string,
  originUrl: string | null,
): PullReference {
  const trimmed = text.trim();
  const groups = firstGroups(written, trimmed);

  const found = groups
    ? referenceOf(groups)
    : inOwnRepository(trimmed, originUrl);

  if (!found) throw refusal(trimmed);

  return found;
}

export const changeId = (reference: PullReference): string =>
  `github:${reference.repository}#${reference.number}`;
