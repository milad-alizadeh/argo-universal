import { Button, EmptyState, ListDetail } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { SignInGate } from '@argo/plugin-kit/sign-in';
import { github } from './github-account';
import type { IssueDeps } from './issue-deps';
import { openFilter } from './issue-filters';
import { RootRows } from './issue-root-rows';
import { useOverview } from './use-overview';
import { useRootProjects, type RootProjects } from './use-root-projects';

type RootProps = { deps: IssueDeps };

/*
 * The Issues section's one list: GitHub's own ways to group a repository's Issues, by status, by you and by label. Each
 * row opens that filter's page, and a window with the list beside its pages opens on the Project's Open filter.
 */
export function IssuesRoot({ deps }: RootProps): JSX.Element {
  const choice = useRootProjects(deps);

  return (
    <SignInGate account={github}>
      <RootLayout deps={deps} choice={choice} />
    </SignInGate>
  );
}

type LayoutProps = RootProps & { choice: RootProjects };

// No Projects, or none could be read: looking again reads them, as one added since is what the section lacked.
function noProjects(
  deps: IssueDeps,
  { project, settled, message }: RootProjects,
): JSX.Element | undefined {
  if (!settled || project) return undefined;

  const checkAgain = (): void => void deps.projects.refresh();

  return (
    <EmptyState
      title={message}
      action={<Button label="Check again" onPress={checkAgain} />}
    />
  );
}

function RootLayout({ deps, choice }: LayoutProps): JSX.Element {
  const state = useOverview(choice.project);
  const { project } = choice;

  return (
    <ListDetail
      title="Issues"
      landing={project && deps.pages.filterPagePath(project, openFilter)}
      list={<RootRows deps={deps} choice={choice} state={state} />}
      empty={noProjects(deps, choice)}
    />
  );
}
