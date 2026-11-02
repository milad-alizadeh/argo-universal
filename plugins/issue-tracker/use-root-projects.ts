import { useEffect, useState } from '@argo/plugin-kit';
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
  const { projects, failed } = useIssueProjects(source);

  useEffect(() => {
    void source.refresh();
  }, [source]);

  const shown = projects ?? [];

  return {
    projects: shown,
    project: projectChosen(shown, source.chosenId()),
    message: projectsMessage(
      projects,
      failed,
      shown.length === 0 ? 'No Projects yet.' : loadingIssues,
    ),
    settled: projects !== undefined || failed === true,
  };
}

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

  useEffect(() => {
    source.choose(id);
    void source
      .known()
      .then((known) =>
        known.some((candidate) => candidate.id === id)
          ? undefined
          : source.refresh(),
      );
  }, [source, id]);

  return { project, message: projectsMessage(projects, failed, goneMessage) };
}
