import { loadingIssues } from './filter-shown';
import type { Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { useAsync } from './use-async';

export type RootProjects = {
  projects: Project[];
  project: Project | undefined;
  message: string;
};

// Loads the Projects once and opens the first.
export function useRootProjects(
  deps: IssueDeps,
  selected?: Project,
): RootProjects {
  const { value, error } = useAsync(deps.listProjects);
  const projects = value ?? [];

  return {
    projects,
    project: selected ?? projects[0],
    message: projectsMessage(value, error),
  };
}

function projectsMessage(
  rows: Project[] | undefined,
  error: string | undefined,
): string {
  if (error !== undefined) return 'Could not load Projects.';

  return rows ? loadedMessage(rows) : 'Loading Projects…';
}

const loadedMessage = (rows: Project[]): string =>
  rows.length === 0 ? 'No Projects yet.' : loadingIssues;
