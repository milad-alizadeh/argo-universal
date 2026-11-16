import { Button, Callout, Detail, EmptyState, Screen } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { assigneeMenu } from './assignee-menu';
import { properties } from './issue-properties';
import type { EditChoices } from './issue-reads';
import type { IssueTo, Shown } from './issue-shown';
import type { JiraFailure } from './jira-client';
import { projectPath } from './jira-paths';
import type { JiraIssue } from './jira-readers';
import type { JiraSite } from './jira-store';
import { priorityMenu } from './priority-menu';
import { signInPath } from './sign-in-page';
import { statusMenu } from './status-menu';

/*
 * One Jira issue's page: its description, its properties beside it, and the header menus that change its status,
 * assignee and priority. Each change is an Operation whose optimistic props show the new value at once; the App puts
 * the old one back, with an error toast, when Jira refuses it. Signed out, no site and a failed read each say why.
 */
export type IssueView =
  | { kind: 'issue'; site: JiraSite; issue: JiraIssue; choices: EditChoices }
  | { kind: 'signed-out'; message: string | null }
  | { kind: 'no-site' }
  | { kind: 'failed'; failure: JiraFailure };

export type IssueFraming = { key: string; projectId: string; to: IssueTo };

const shownIssue = (shown: Shown): JSX.Element => (
  <Screen
    title={shown.issue.summary || shown.issue.key}
    actions={[statusMenu(shown), assigneeMenu(shown), priorityMenu(shown)]}
    aside={properties(shown)}
  >
    <Detail markdown={shown.issue.description || '_No description._'} />
  </Screen>
);

const failureTitles: Record<JiraFailure['kind'], string> = {
  'signed-out': 'Sign in to Jira',
  forbidden: 'Jira refused this',
  'not-found': 'Jira couldn’t find this issue',
  'rate-limited': 'Jira is busy',
  failed: 'Couldn’t read this issue',
};

const failed = (
  failure: JiraFailure,
  { key, to }: IssueFraming,
): JSX.Element => (
  <Screen title={key}>
    <Callout
      tone="danger"
      title={failureTitles[failure.kind]}
      description={failure.message}
      actions={<Button label="Try again" onPress={to.run('checkAgain', {})} />}
    />
  </Screen>
);

const signedOut = (
  message: string | null,
  { key, to }: IssueFraming,
): JSX.Element => (
  <Screen title={key}>
    <EmptyState
      title="Sign in to Jira"
      description={message ?? 'Sign in to Jira to see this issue.'}
      action={<Button label="Sign in" onPress={to.go(signInPath)} />}
    />
  </Screen>
);

const noSite = ({ key, projectId, to }: IssueFraming): JSX.Element => (
  <Screen title={key}>
    <EmptyState
      title="Choose a Jira site"
      description="Choose the Atlassian site this Project’s issues are on to see this issue."
      action={
        <Button label="Choose a site" onPress={to.go(projectPath(projectId))} />
      }
    />
  </Screen>
);

type Unshown = Exclude<IssueView, { kind: 'issue' }>;

function unshown(view: Unshown, framing: IssueFraming): JSX.Element {
  if (view.kind === 'failed') return failed(view.failure, framing);

  return view.kind === 'no-site'
    ? noSite(framing)
    : signedOut(view.message, framing);
}

export const issueScreen = (
  view: IssueView,
  framing: IssueFraming,
): JSX.Element =>
  view.kind === 'issue'
    ? shownIssue({ ...view, projectId: framing.projectId, to: framing.to })
    : unshown(view, framing);
