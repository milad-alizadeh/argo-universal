import { Action, EmptyState, Screen } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { failedScreen } from './failure-view';
import { issueList } from './issue-rows';
import type { ProjectView } from './jira-setup';
import { changeSite, setupScreen } from './setup-views';
import type { Framing } from './view-frame';

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

const issues = (
  { site, project, page }: Issues,
  framing: Framing,
): JSX.Element => (
  <Screen
    title={project.name}
    caption={`${project.key} · ${site.host}`}
    width="full"
    actions={projectActions(framing)}
  >
    {page.issues.length === 0
      ? noIssues(project.key)
      : issueList(site, page.issues, framing.to)}
  </Screen>
);

// The page one Argo Project's Jira shows: the step it is at, saying what to do next.
export function projectScreen(
  view: ProjectView,
  framing: Framing,
): JSX.Element {
  if (view.kind === 'issues') return issues(view, framing);

  return view.kind === 'failed'
    ? failedScreen(view, framing)
    : setupScreen(view, framing);
}
