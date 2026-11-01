import {
  EmptyState,
  List,
  ListItem,
  Screen,
  useCallback,
} from '@argo/plugin-kit';
import type { Argo, PluginRenderContext } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { IssueDetailPage } from './issue-detail';
import { statusMark } from './issue-status-mark';
import { statuses } from './issue-status-view';
import type { IssueLink } from './tracker-storage';
import { useAsync } from './use-async';
import { useIssueDetail } from './use-issue-detail';

/*
 * The Issue tracker's Workbench card and its Inspector tab (ADR-0035, ADR-0039). Both are declared in the manifest,
 * Argo draws the card around the first and opens the second when the card's body is pressed, and both open for the
 * Session whose Workbench they are in.
 */
export const sessionCardPath = '/session-issue';

export const sessionTabPath = '/session-issue/full';

type PageProps = {
  deps: IssueDeps;
  context: Pick<PluginRenderContext, 'sessionId'>;
};

type Attached = { project: Project; number: number };

type Found = Attached & { deps: IssueDeps };

// What a page says in place of the Issue.
type Message = { message: string; description?: string };

type Frame = (children: JSX.Element) => JSX.Element;

type Draw = (found: Found) => JSX.Element;

type PageKind = { draw: Draw; frame: Frame };

export function registerSessionPages(api: Argo, deps: IssueDeps): void {
  api.pages.register(sessionCardPath, ({ context }) => (
    <SessionIssueCard deps={deps} context={context} />
  ));

  api.pages.register(sessionTabPath, ({ context }) => (
    <SessionIssueTab deps={deps} context={context} />
  ));
}

const noSession: Message = { message: 'No Session' };

const loading: Message = { message: 'Loading Issue…' };

const failed: Message = { message: 'Could not load the Issue.' };

const noIssue: Message = {
  message: 'No Issue attached',
  description:
    'An Agent attaches a Session to an Issue with the issue-tracker.attach Operation.',
};

// The Issue this Session was most recently attached to, if its Project is still there.
async function loadAttached(
  deps: IssueDeps,
  sessionId: string | undefined,
): Promise<Attached | null> {
  const link = await attachedLink(deps, sessionId);

  return link ? attachedIssue(deps, link) : null;
}

async function attachedLink(
  deps: IssueDeps,
  sessionId: string | undefined,
): Promise<IssueLink | undefined> {
  const [link] =
    sessionId === undefined ? [] : await deps.storage.sessionLinks([sessionId]);

  return link;
}

async function attachedIssue(
  deps: IssueDeps,
  { projectId, number }: { projectId: string; number: number },
): Promise<Attached | null> {
  const projects = await deps.listProjects();
  const project = projects.find(({ id }) => id === projectId);

  return project ? { project, number } : null;
}

const pending = (error: string | undefined): Message =>
  error ? failed : loading;

function messageFor(
  sessionId: string | undefined,
  value: Attached | null | undefined,
  error: string | undefined,
): Message {
  if (sessionId === undefined) return noSession;

  return value === undefined ? pending(error) : noIssue;
}

function useSessionIssue({ deps, context }: PageProps): Attached | Message {
  const { sessionId } = context;

  const { value, error } = useAsync(
    useCallback(() => loadAttached(deps, sessionId), [deps, sessionId]),
  );

  return value ?? messageFor(sessionId, value, error);
}

// Draws the page for the Session's Issue, or says why there is none.
function SessionIssuePage(props: PageProps & PageKind): JSX.Element {
  const attached = useSessionIssue(props);

  if ('message' in attached)
    return props.frame(
      <EmptyState
        title={attached.message}
        description={attached.description}
      />,
    );

  return props.draw({ ...attached, deps: props.deps });
}

const bare: Frame = (children) => children;

const titled: Frame = (children) => <Screen title="Issue">{children}</Screen>;

// The card: a summary of the Session's Issue, one row. Argo opens the full view when the card's body is pressed.
function SessionIssueCard(props: PageProps): JSX.Element {
  return (
    <SessionIssuePage
      {...props}
      frame={bare}
      draw={(found) => <CardRow {...found} />}
    />
  );
}

function CardRow(found: Found): JSX.Element {
  const { issue } = useIssueDetail(found);

  if (!issue) return <EmptyState title={`#${found.number}`} />;

  return (
    <List>
      <ListItem
        key="issue"
        title={issue.title}
        value={`#${issue.number} · ${statuses[issue.status].text}`}
        leading={statusMark(issue)}
      />
    </List>
  );
}

// The Inspector tab: the whole Issue, as its own page draws it.
function SessionIssueTab(props: PageProps): JSX.Element {
  return (
    <SessionIssuePage
      {...props}
      frame={titled}
      draw={(found) => <IssueDetailPage {...found} />}
    />
  );
}
