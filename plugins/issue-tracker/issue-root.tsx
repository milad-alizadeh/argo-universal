import { EmptyState, ListDetail } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { IssueDeps } from './issue-deps';
import type { IssueFilter } from './issue-filters';
import type { Project } from './issue-project';
import { RootRows } from './issue-root-rows';
import { SignInGate } from './sign-in';
import { useOverview, type OverviewState } from './use-overview';
import { useRootProjects, type RootProjects } from './use-root-projects';

type RootProps = {
  deps: IssueDeps;
  projectId?: string;
  filter?: IssueFilter;
  // The page beside the list, drawn for the Project as it is now.
  detail?: (project: Project) => JSX.Element;
};

/*
 * The Issues section's landing page: GitHub's own ways to group a repository's Issues, by status, by
 * you and by label. Each row opens that filter's list.
 */
export function IssuesRoot(props: RootProps): JSX.Element {
  const choice = useRootProjects(props.deps, props.projectId);
  const state = useOverview(choice.project);
  const { signIn } = state;

  return signIn ? (
    <SignInGate
      signIn={props.deps.signIn}
      need={signIn}
      refresh={state.refresh}
    />
  ) : (
    <RootLayout {...props} choice={choice} state={state} />
  );
}

type LayoutProps = Pick<RootProps, 'deps' | 'detail' | 'filter'> & {
  choice: RootProjects;
  state: OverviewState;
};

const detailFor = (
  detail: RootProps['detail'],
  project: Project | undefined,
): JSX.Element | undefined => (project && detail ? detail(project) : undefined);

function RootLayout(props: LayoutProps): JSX.Element {
  return (
    <ListDetail
      title="Issues"
      list={<RootRows {...props} selected={props.filter?.id} />}
      detail={detailFor(props.detail, props.choice.project)}
      empty={<SelectFilter />}
    />
  );
}

const SelectFilter = (): JSX.Element => (
  <EmptyState
    title="Select a filter"
    description="Choose a group from the sidebar."
  />
);
