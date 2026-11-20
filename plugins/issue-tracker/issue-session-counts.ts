import type { IssueDeps } from './issue-deps';
import type { IssueLink } from './tracker-storage';

// How many Sessions are attached to each Issue of one Project, by Issue number; an Issue with none has no entry.
export type SessionCounts = Record<number, number>;

type CountDeps = Pick<IssueDeps, 'getSession'> & {
  storage: Pick<IssueDeps['storage'], 'projectLinks'>;
};

/*
 * The Project's attachments, counted per Issue. A Session that has since gone or been archived is left out, as the Issue's own
 * page leaves it out, so a row never marks work its page does not list. Storage that cannot be read marks nothing.
 */
export async function sessionCounts(
  deps: CountDeps,
  projectId: string,
): Promise<SessionCounts> {
  const links = await deps.storage.projectLinks(projectId).catch(() => []);
  const existing = await existingSessionIds(deps.getSession, links);

  return countByIssue(links.filter((link) => existing.has(link.sessionId)));
}

// Each Session is asked for once, however many Issues it is attached to.
async function existingSessionIds(
  getSession: IssueDeps['getSession'],
  links: IssueLink[],
): Promise<Set<string>> {
  const ids = [...new Set(links.map((link) => link.sessionId))];

  const found = await Promise.all(
    ids.map(async (id) => ((await exists(getSession, id)) ? [id] : [])),
  );

  return new Set(found.flat());
}

const exists = async (
  getSession: IssueDeps['getSession'],
  sessionId: string,
): Promise<boolean> =>
  (await getSession(sessionId).catch(() => null))?.archived === false;

function countByIssue(links: Pick<IssueLink, 'number'>[]): SessionCounts {
  const counts = new Map<number, number>();

  for (const { number } of links)
    counts.set(number, (counts.get(number) ?? 0) + 1);

  return Object.fromEntries(counts);
}
