import { EmptyState, List, ListItem, Screen } from '@argo/plugin-kit';
import type { Argo, PluginRenderContext } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { IssueDeps } from './issue-deps';
import { IssueDetailPage } from './issue-detail';
import { statusMark } from './issue-status-mark';
import { statuses } from './issue-status-view';
import type { Called } from './use-call';
import { useIssueDetail } from './use-issue-detail';
import { useSessionIssue, type Attached } from './use-session-issue';

/*
 * The Issue tracker's Workbench card and its Inspector tab (ADR-0035, ADR-0039). Both are declared in the manifest,
 * Argo draws the card around the first and opens the second when the card's body is pressed, and both open for the
 * Session whose Workbench they are in. A card that draws nothing is not drawn, so the card says nothing until the
 * Session has an Issue; the tab keeps its messages.
 */
export const sessionCardPath = '/session-issue';

export const sessionTabPath = '/session-issue/full';

type PageProps = {
  deps: IssueDeps;
  context: Pick<PluginRenderContext, 'sessionId'>;
};

type Found = Attached & { deps: IssueDeps };

// What the tab says in place of the Issue.
type Message = { message: string; description?: string };

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

const pending = (error: string | undefined): Message =>
  error ? failed : loading;

function messageFor(
  sessionId: string | undefined,
  { value, error }: Called<Attached | null>,
): Message {
  if (sessionId === undefined) return noSession;

  return value === undefined ? pending(error) : noIssue;
}

/*
 * The card: a summary of the Session's Issue, one row. It draws nothing with no Session, while the link loads and with
 * no Issue; a link that could not load still draws, since nothing would read as no Issue.
 */
function SessionIssueCard({ deps, context }: PageProps): JSX.Element | null {
  const attached = useSessionIssue(deps, context.sessionId);

  if (attached.value) return <CardRow {...attached.value} deps={deps} />;

  return attached.error ? <EmptyState title={failed.message} /> : null;
}

// The number and state are the subtitle, not a value, which would claim width first and cut the title. Argo opens the full view when the card's body is pressed.
function CardRow(found: Found): JSX.Element {
  const { issue, message } = useIssueDetail(found);

  if (!issue) return <UnloadedRow number={found.number} message={message} />;

  return (
    <List>
      <ListItem
        key="issue"
        title={issue.title}
        subtitle={`#${issue.number} · ${statuses[issue.status].text}`}
        leading={statusMark(issue)}
      />
    </List>
  );
}

// An attached Issue keeps its card: its number while GitHub answers, and why when it cannot load.
function UnloadedRow(props: { number: number; message: string }): JSX.Element {
  const title = `#${props.number}`;

  if (!props.message) return <EmptyState title={title} />;

  return (
    <EmptyState title={`${title} could not load`} description={props.message} />
  );
}

// The Inspector tab: the whole Issue, as its own page draws it, or why there is none.
function SessionIssueTab({ deps, context }: PageProps): JSX.Element {
  const attached = useSessionIssue(deps, context.sessionId);

  if (attached.value)
    return <IssueDetailPage {...attached.value} deps={deps} />;

  const { message, description } = messageFor(context.sessionId, attached);

  return (
    <Screen title="Issue">
      <EmptyState title={message} description={description} />
    </Screen>
  );
}
