import type { Argo } from '@argo/plugin-kit';
import { githubRepositoryFromOrigin } from './github-repository';
import type { IssueDeps } from './issue-deps';
import type { IssueSummaries, IssueSummary } from './issue-summary';

const linkMarkSlot = 'argo/link/mark/v1';

// A link as the Slot asks about it: its URL, and the Project it is drawn in.
type Asked = Readonly<{ href: string; projectId: string }>;

// An Issue of the Project's own repository that a link points at, with the URL it answers for.
type Marked = { href: string; projectId: string; number: number };

type Mark = { kind: 'issue'; state: IssueSummary['status'] };

const issueUrl =
  /^https:\/\/github\.com\/(?<repository>[\w.-]+\/[\w.-]+?)\/issues\/(?<number>[1-9]\d{0,8})(?:[/?#].*)?$/;

type Repositories = ReadonlyMap<string, string>;

// Each Project's GitHub repository, in lower case: GitHub names match without regard to case.
async function repositoriesOf(
  listProjects: IssueDeps['listProjects'],
): Promise<Repositories> {
  const projects = await listProjects();

  return new Map(
    projects.map(({ id, originUrl }) => [
      id,
      (githubRepositoryFromOrigin(originUrl) ?? '').toLowerCase(),
    ]),
  );
}

type Groups = Readonly<Record<string, string>>;

const isOwn = (groups: Groups, own: string | undefined): boolean =>
  groups.repository?.toLowerCase() === own;

const groupsOf = (href: string): Groups | undefined =>
  issueUrl.exec(href)?.groups;

// The Tracker reads the Project's own repository, so a link to another repository's Issue is not its to answer.
function markedOf(repositories: Repositories, asked: Asked): Marked[] {
  const groups = groupsOf(asked.href);

  if (!groups) return [];

  return isOwn(groups, repositories.get(asked.projectId))
    ? [{ ...asked, number: Number(groups.number) }]
    : [];
}

type Summaries = Pick<IssueSummaries, 'answer'>;

const entryOf = (
  { href }: Marked,
  summary: IssueSummary | null | undefined,
): [string, Mark[]][] =>
  summary ? [[href, [{ kind: 'issue', state: summary.status }]]] : [];

type State = { deps: IssueDeps; summaries: Summaries };

async function marksOf(
  state: State,
  asked: readonly Asked[],
): Promise<Record<string, Mark[]>> {
  const repositories = await repositoriesOf(state.deps.listProjects);
  const links = asked.flatMap((link) => markedOf(repositories, link));
  const stored = await state.summaries.answer(links);

  return Object.fromEntries(
    links.flatMap((link, index) => entryOf(link, stored[index])),
  );
}

/*
 * The state beside a link to an Issue (ADR-0052): the same shared Query answers the Session row
 * and Session bar read. Query changes refresh the visible marks.
 */
export function registerLinkMarks(
  api: Argo,
  deps: IssueDeps,
  summaries: Summaries,
): void {
  const state: State = { deps, summaries };

  api.slots.register(linkMarkSlot, ({ contexts }) => marksOf(state, contexts));
}
