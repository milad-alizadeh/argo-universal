import { loadingIssues } from './filter-shown';
import type { Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { useAsync } from './use-async';

export type RootProjects = {
  projects: Project[];
  project: Project | undefined;
  message: string;
};

/*
 * Loads the Projects each time a page opens, so a Project's remote is never older than the page, and
 * opens the one a page names, or the first.
 */
export function useRootProjects(
  deps: IssueDeps,
  selectedId?: string,
): RootProjects {
  const { value, error } = useAsync(deps.listProjects);
  const projects = value ?? [];

  return {
    projects,
    project:
      selectedId === undefined
        ? projects[0]
        : projects.find(({ id }) => id === selectedId),
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
