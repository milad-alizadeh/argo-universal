import {
  Action,
  Button,
  Callout,
  EmptyState,
  Screen,
  Stack,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { issueBoard, viewSwitch, type IssuesView } from './issue-board';
import { issueList } from './issue-rows';
import type { JiraFailure } from './jira-client';
import type { ProjectView } from './jira-setup';
import { changeSite, setupScreen } from './setup-views';
import type { Framing, IssuesFraming, IssuesState } from './view-frame';

const failureTitles: Record<JiraFailure['kind'], string> = {
  'signed-out': 'Sign in to Jira',
  forbidden: 'Jira refused this',
  'not-found': 'Jira couldn’t find this project',
  'rate-limited': 'Jira is busy',
  failed: 'Couldn’t read Jira',
};

const anotherProject = {
  label: 'Choose another Jira project',
  variant: 'secondary',
} as const;

type Failed = Extract<ProjectView, { kind: 'failed' }>;

const failureCallout = (failure: JiraFailure): JSX.Element => (
  <Callout
    tone="danger"
    title={failureTitles[failure.kind]}
    description={failure.message}
  />
);

const failureBody = (
  failure: JiraFailure,
  { to, projectId }: Framing,
): JSX.Element => (
  <Stack direction="column" gap={6}>
    {failureCallout(failure)}
    <Button label="Try again" onPress={to.run('checkAgain', {})} />
    <Button
      {...anotherProject}
      onPress={to.run('forgetProject', { projectId })}
    />
  </Stack>
);

const failed = ({ site, failure }: Failed, framing: Framing): JSX.Element => (
  <Screen title="Jira" caption={site.host} actions={changeSite(framing)}>
    {failureBody(failure, framing)}
  </Screen>
);

const swapIcon = {
  sf: 'arrow.left.arrow.right',
  material: 'swap_horiz',
} as const;

const projectActions = (framing: Framing): JSX.Element[] => [
  <Action
    key="change-project"
    label="Change Jira project"
    icon={swapIcon}
    onPress={framing.to.run('forgetProject', { projectId: framing.projectId })}
  />,
  changeSite(framing),
];

type Issues = Extract<ProjectView, { kind: 'issues' }>;

const noIssues = (key: string): JSX.Element => (
  <EmptyState
    title={`No issues in ${key}`}
    description="Issues created in this Jira project show here."
  />
);

const viewOf = ({ view }: IssuesState): IssuesView =>
  view === 'board' ? 'board' : 'list';

// The issues as the Page state's view shows them: a list, or a board with the project's statuses as its columns.
const shownIssues = (
  { site, page, statuses = [] }: Issues,
  framing: IssuesFraming,
): JSX.Element =>
  viewOf(framing.state) === 'board'
    ? issueBoard(framing, page.issues, statuses)
    : issueList({ ...framing, site }, page.issues);

const issues = (view: Issues, framing: IssuesFraming): JSX.Element => (
  <Screen
    title={view.project.name}
    caption={`${view.project.key} · ${view.site.host}`}
    width="full"
    actions={projectActions(framing)}
  >
    {viewSwitch(viewOf(framing.state), framing.to)}
    {view.page.issues.length === 0
      ? noIssues(view.project.key)
      : shownIssues(view, framing)}
  </Screen>
);

// The page one Argo Project's Jira shows: the step it is at, saying what to do next.
export function projectScreen(
  view: ProjectView,
  framing: IssuesFraming,
): JSX.Element {
  if (view.kind === 'issues') return issues(view, framing);

  return view.kind === 'failed'
    ? failed(view, framing)
    : setupScreen(view, framing);
}
