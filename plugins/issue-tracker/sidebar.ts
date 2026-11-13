import type { LoaderInput } from '@argo/plugin-kit';
import { answered } from './github-reads';
import type { Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import type { Overview } from './overview';

// One Project's group in the sidebar: its overview, and why it could not be read.
export type ProjectGroup = {
  project: Project;
  overview: Overview | null;
  message: string;
};

// The sidebar's groups, one per Project with a Tracker chosen, and what to say when there are none.
export type Sidebar = { groups: ProjectGroup[]; message: string };

// Which Project and filter the page is for, so its row reads as selected.
export type SidebarSelection = { projectId: string; filterId?: string };

type Deps = Pick<IssueDeps, 'listProjects' | 'storage' | 'reads'>;

type Read = LoaderInput['read'];

/*
 * Reads the Projects each time a page draws, so a Project's remote is never older than the page, and keeps only those
 * with a Tracker chosen: a Project without one has no Issues to group.
 */
export async function loadSidebar(deps: Deps, read: Read): Promise<Sidebar> {
  const projects = await deps.listProjects().catch(() => null);

  if (!projects) return { groups: [], message: 'Could not load Projects.' };

  const tracked = await withTracker(deps, projects);

  const groups = await Promise.all(
    tracked.map((project) => groupOf(deps, read, project)),
  );

  return { groups, message: noGroupsMessage(projects, groups) };
}

// A Tracker choice that cannot be read leaves its Project out, as one never made does.
async function withTracker(
  deps: Deps,
  projects: Project[],
): Promise<Project[]> {
  const chosen = await Promise.all(
    projects.map((project) =>
      deps.storage.selectedTracker(project.id).catch(() => null),
    ),
  );

  return projects.filter((_project, index) => chosen[index] !== null);
}

async function groupOf(
  deps: Deps,
  read: Read,
  project: Project,
): Promise<ProjectGroup> {
  const query = deps.reads.overview({ projectId: project.id });
  const { value, message } = await answered(read(query));

  return { project, overview: value, message };
}

function noGroupsMessage(projects: Project[], groups: ProjectGroup[]): string {
  if (groups.length > 0) return '';

  return projects.length === 0
    ? 'No Projects yet.'
    : 'No Project has an Issue tracker. Choose one in Project details.';
}
