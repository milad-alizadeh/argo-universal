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
  const project = chosenProject(projects, selectedId);

  return {
    projects,
    project,
    message: projectsMessage(value, error, selectedId),
  };
}

const chosenProject = (
  projects: Project[],
  selectedId: string | undefined,
): Project | undefined =>
  selectedId === undefined
    ? projects[0]
    : projects.find(({ id }) => id === selectedId);

function projectsMessage(
  rows: Project[] | undefined,
  error: string | undefined,
  selectedId: string | undefined,
): string {
  if (error !== undefined) return 'Could not load Projects.';

  return rows ? loadedMessage(rows, selectedId) : 'Loading Projects…';
}

function loadedMessage(
  rows: Project[],
  selectedId: string | undefined,
): string {
  if (rows.length === 0) return 'No Projects yet.';

  return chosenProject(rows, selectedId) ? loadingIssues : goneMessage;
}

const goneMessage = 'This Project no longer exists.';
