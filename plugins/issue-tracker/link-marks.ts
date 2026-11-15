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

type Summaries = Pick<IssueSummaries, 'cached' | 'refresh'>;

const storedOf = (
  summaries: Summaries,
  links: readonly Marked[],
): Promise<(IssueSummary | null)[]> =>
  Promise.all(links.map((link) => summaries.cached(link)));

const entryOf = (
  { href }: Marked,
  summary: IssueSummary | null | undefined,
): [string, Mark[]][] =>
  summary ? [[href, [{ kind: 'issue', state: summary.status }]]] : [];

type State = {
  deps: IssueDeps;
  summaries: Summaries;
  // A refresh is under way, so another ask starts none.
  busy: boolean;
  // The last refresh changed a stored summary, so the ask that follows it is answered from what it stored.
  echo: boolean;
};

async function refresh(
  state: State,
  links: readonly Marked[],
  before: readonly (IssueSummary | null)[],
): Promise<void> {
  await state.summaries.refresh(links, state.deps.readQuery);

  const after = await storedOf(state.summaries, links);

  state.echo = JSON.stringify(after) !== JSON.stringify(before);
}

// A refresh that could not run leaves the summaries as they were; the next ask runs it again.
const leftAsItWas = (): void => {};

// Whether this ask starts no refresh: one is under way, or the last one caused this very ask.
function skips(state: State): boolean {
  const skipped = state.echo || state.busy;

  state.echo = false;

  return skipped;
}

// The Tracker is asked behind the Slot's answer, through the one read that stores an Issue's summary.
function behind(
  state: State,
  links: readonly Marked[],
  before: readonly (IssueSummary | null)[],
): void {
  if (skips(state)) return;

  state.busy = true;
  void refresh(state, links, before)
    .catch(leftAsItWas)
    .finally(() => {
      state.busy = false;
    });
}

async function marksOf(
  state: State,
  asked: readonly Asked[],
): Promise<Record<string, Mark[]>> {
  const repositories = await repositoriesOf(state.deps.listProjects);
  const links = asked.flatMap((link) => markedOf(repositories, link));
  const stored = await storedOf(state.summaries, links);

  behind(state, links, stored);

  return Object.fromEntries(
    links.flatMap((link, index) => entryOf(link, stored[index])),
  );
}

/*
 * The state beside a link to an Issue (ADR-0052): the summary the Session row and the Session bar read, so a link
 * never says other than they do, refreshed while a feed that shows the link is open.
 */
export function registerLinkMarks(
  api: Argo,
  deps: IssueDeps,
  summaries: Summaries,
): void {
  const state: State = { deps, summaries, busy: false, echo: false };

  api.slots.register(linkMarkSlot, ({ contexts }) => marksOf(state, contexts));
}
