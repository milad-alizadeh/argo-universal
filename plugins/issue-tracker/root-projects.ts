import { loadingIssues } from './filter-shown';
import type { Project } from './issue-client';
import type { IssueDeps } from './issue-deps';

// The Projects to group Issues of, the one a page opened for, and what to say in place of its Issues.
export type RootProjects = {
  projects: Project[];
  project: Project | undefined;
  message: string;
};

/*
 * Reads the Projects each time a page draws, so a Project's remote is never older than the page, and opens
 * the one a page names, or the first.
 */
export async function rootProjects(
  deps: Pick<IssueDeps, 'listProjects'>,
  selectedId?: string,
): Promise<RootProjects> {
  const projects = await deps.listProjects().catch(() => undefined);
  const shown = projects ?? [];

  return {
    projects: shown,
    project: chosenProject(shown, selectedId),
    message: projectsMessage(projects, selectedId),
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
  selectedId: string | undefined,
): string {
  if (!rows) return 'Could not load Projects.';

  if (rows.length === 0) return 'No Projects yet.';

  return chosenProject(rows, selectedId) ? loadingIssues : goneMessage;
}

const goneMessage = 'This Project no longer exists.';
