import type { LoaderInput } from '@argo/plugin-kit';
import { answered } from './github-reads';
import type { Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import type { Overview } from './overview';

// One Project's section in the sidebar: its overview, and why it could not be read.
export type ProjectSection = {
  project: Project;
  overview: Overview | null;
  message: string;
};

// The sidebar's sections, one per Project with a Tracker chosen, and what to say when there are none.
export type Sidebar = { sections: ProjectSection[]; message: string };

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

  if (!projects) return { sections: [], message: 'Could not load Projects.' };

  const tracked = await withTracker(deps, projects);

  const sections = await Promise.all(
    tracked.map((project) => sectionOf(deps, read, project)),
  );

  return { sections, message: noSectionsMessage(projects, sections) };
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

async function sectionOf(
  deps: Deps,
  read: Read,
  project: Project,
): Promise<ProjectSection> {
  const query = deps.reads.overview({ projectId: project.id });
  const { value, message } = await answered(read(query));

  return { project, overview: value, message };
}

function noSectionsMessage(
  projects: Project[],
  sections: ProjectSection[],
): string {
  if (sections.length > 0) return '';

  return projects.length === 0
    ? 'No Projects yet.'
    : 'No Project has an Issue tracker. Choose one in Project details.';
}
