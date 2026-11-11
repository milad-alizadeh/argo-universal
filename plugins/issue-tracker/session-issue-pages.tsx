import {
  Callout,
  EmptyState,
  List,
  ListItem,
  Screen,
  type Argo,
  type LoaderInput,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue } from './github-issues';
import type { Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { IssueDetailPage } from './issue-detail';
import { loadIssueDetail, type IssueDetailData } from './issue-detail-data';
import { statusMark } from './issue-status-mark';
import { statuses } from './issue-status-view';
import type { IssueLink } from './tracker-storage';

/*
 * The Issue tracker's Workbench card and its Inspector tab (ADR-0035, ADR-0039, ADR-0050). Both are declared in
 * the manifest and are Loader pages drawn for the Session whose Workbench they are in. The card page returns
 * `null` while there is no Issue attached, so Argo draws no card, no tab and no phone row; an attached Issue that
 * fails to load still draws its card, and says so, because hiding it would read as "no Issue".
 */
export const sessionCardPath = '/session-issue';

export const sessionTabPath = '/session-issue/full';

type Input = LoaderInput;

type Attached = { project: Project; number: number };

// The Issue the Session is attached to, with what loading it answered.
type SessionIssue = Attached & { detail: IssueDetailData };

export function defineSessionIssuePages(argo: Argo, deps: IssueDeps): void {
  argo.pages.define(sessionCardPath, {
    load: (input) => loadSessionIssue(deps, input),
    render: sessionCard,
  });

  argo.pages.define(sessionTabPath, {
    load: (input) => loadSessionIssue(deps, input),
    render: sessionTab,
  });
}

// The Issue this Session was most recently attached to, if its Project is still there.
async function loadAttached(
  deps: IssueDeps,
  sessionId: string | undefined,
): Promise<Attached | null> {
  const [link] = sessionId ? await deps.storage.sessionLinks([sessionId]) : [];

  return link ? attachedIn(await deps.listProjects(), link) : null;
}

const attachedIn = (
  projects: readonly Project[],
  { projectId, number }: IssueLink,
): Attached | null => {
  const project = projects.find(({ id }) => id === projectId);

  return project ? { project, number } : null;
};

async function loadSessionIssue(
  deps: IssueDeps,
  { context, read }: Input,
): Promise<SessionIssue | null> {
  const attached = await loadAttached(deps, context.sessionId);

  if (!attached) return null;

  return { ...attached, detail: await loadIssueDetail({ deps, read, ...attached }) };
}

// The card: a summary of the Session's Issue, one row, or nothing while there is none.
const sessionCard = (found: SessionIssue | null): JSX.Element | null =>
  found && (found.detail.ok ? issueRow(found.detail.issue) : failed(found));

const issueRow = (issue: Issue): JSX.Element => (
  <List>
    <ListItem
      key="issue"
      title={issue.title}
      subtitle={`#${issue.number} · ${statuses[issue.status].text}`}
      leading={statusMark(issue)}
    />
  </List>
);

// An Issue that cannot be read keeps its card and says so, which hiding it would not.
const failed = ({ detail, number }: SessionIssue): JSX.Element => (
  <Callout
    tone="danger"
    title={`Couldn’t load #${number}`}
    description={detail.ok ? undefined : detail.message}
  />
);

const noIssue = (
  <Screen title="Issue">
    <EmptyState
      title="No Issue attached"
      description="An Agent attaches a Session to an Issue with the issue-tracker.attach Operation."
    />
  </Screen>
);

// The Inspector tab: the whole Issue, as its own page draws it, or the tab's own line when there is none.
const sessionTab = (found: SessionIssue | null, to: PageTo): JSX.Element =>
  found ? (
    <IssueDetailPage
      data={found.detail}
      projectId={found.project.id}
      number={found.number}
      to={to}
    />
  ) : (
    noIssue
  );
