import { EmptyState, ListDetail } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { SignInGate } from '@argo/plugin-kit/sign-in';
import { github } from './github-account';
import type { IssueDeps } from './issue-deps';
import type { IssueFilter } from './issue-filters';
import type { Project } from './issue-project';
import { RootRows } from './issue-root-rows';
import { useOverview } from './use-overview';
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

  return (
    <SignInGate account={github}>
      <RootLayout {...props} choice={choice} />
    </SignInGate>
  );
}

type LayoutProps = Pick<RootProps, 'deps' | 'detail' | 'filter'> & {
  choice: RootProjects;
};

const detailFor = (
  detail: RootProps['detail'],
  project: Project | undefined,
): JSX.Element | undefined => (project && detail ? detail(project) : undefined);

function RootLayout(props: LayoutProps): JSX.Element {
  const state = useOverview(props.choice.project);

  return (
    <ListDetail
      title="Issues"
      list={<RootRows {...props} state={state} selected={props.filter?.id} />}
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
