import { useEffect, usePageContext, useState } from '@argo/plugin-kit';
import { loadingIssues } from './filter-shown';
import type { IssueDeps } from './issue-deps';
import type { Project } from './issue-project';
import type { IssueProjects, ProjectsRead } from './issue-projects';

// Draws again whenever the Projects or the chosen one change.
function useIssueProjects(projects: IssueProjects): ProjectsRead {
  const [, setVersion] = useState(0);

  useEffect(
    () => projects.subscribe(() => setVersion((version) => version + 1)),
    [projects],
  );

  return projects.read();
}

export type RootProjects = {
  projects: Project[];
  project: Project | undefined;
  message: string;
  // The Projects' call has answered, so `project` says what there is to show.
  settled: boolean;
};

/*
 * The live list loads the Projects when it opens and shows the one the shown page chose, or the first. The list keeps
 * its place while pages change beside it, so a page's Project is never read by listing them again.
 */
export function useRootProjects(deps: IssueDeps): RootProjects {
  const { projects: source } = deps;
  const read = useIssueProjects(source);
  const { connectionId } = usePageContext();

  useEffect(() => {
    void source.refresh();
  }, [source]);

  const shown = read.projects ?? [];

  return {
    projects: shown,
    project: projectChosen(shown, source.chosenId(connectionId)),
    message: rootMessage(read),
    settled: read.projects !== undefined || read.failed === true,
  };
}

const rootMessage = ({ projects, failed }: ProjectsRead): string =>
  projectsMessage(
    projects,
    failed,
    projects?.length ? loadingIssues : 'No Projects yet.',
  );

const projectChosen = (
  projects: Project[],
  id: string | undefined,
): Project | undefined =>
  projects.find((project) => project.id === id) ?? projects[0];

function projectsMessage(
  projects: Project[] | undefined,
  failed: boolean | undefined,
  loaded: string,
): string {
  if (failed) return 'Could not load Projects.';

  return projects ? loaded : 'Loading Projects…';
}

export type PageProject = { project: Project | undefined; message: string };

const goneMessage = 'This Project no longer exists.';

/*
 * The Project a page names, which the list then shows as chosen. One the known Projects lack is asked for once, as a
 * Project added since they loaded may be what the page opened for.
 */
export function usePageProject(deps: IssueDeps, id: string): PageProject {
  const { projects: source } = deps;
  const { projects, failed } = useIssueProjects(source);
  const project = projects?.find((candidate) => candidate.id === id);
  const { connectionId } = usePageContext();

  useEffect(() => {
    source.choose(connectionId, id);
    void listUnlessKnown(source, id);
  }, [source, connectionId, id]);

  return { project, message: projectsMessage(projects, failed, goneMessage) };
}

async function listUnlessKnown(
  source: IssueProjects,
  id: string,
): Promise<void> {
  const known = await source.known();

  if (!known.some((candidate) => candidate.id === id)) await source.refresh();
}
