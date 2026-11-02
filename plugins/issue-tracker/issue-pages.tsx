import { EmptyState, Screen, type Argo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { SignInGate } from '@argo/plugin-kit/sign-in';
import { github } from './github-account';
import type { IssueDeps, IssuePages } from './issue-deps';
import { IssueDetailPage } from './issue-detail';
import { FilterPage } from './issue-filter-page';
import { builtInFilters, type IssueFilter } from './issue-filters';
import { filterPath, issuePath } from './issue-paths';
import type { Project } from './issue-project';
import { usePageProject } from './use-root-projects';

type Page = Parameters<Argo['pages']['register']>[1];

/*
 * A page path names one Project's filter or Issue, so each is registered the first time a row links
 * to it. Every Project's built-in filters are registered as the Plugin starts, so their links open
 * before the Issues page has drawn.
 */
export function createIssuePages(
  argo: Argo,
  shared: Omit<IssueDeps, 'pages'>,
): IssuePages {
  const pages = pagePaths(registrar(argo), () => deps);
  const deps: IssueDeps = { ...shared, pages };

  void registerBuiltIns(deps);

  return pages;
}

type Register = (path: string, page: Page) => string;

const pagePaths = (register: Register, deps: () => IssueDeps): IssuePages => ({
  filterPagePath: ({ id }, filter) =>
    register(
      filterPath(id, filter),
      filterPage({ projectId: id, filter, deps: deps() }),
    ),
  issuePagePath: ({ id }, number) =>
    register(
      issuePath(id, number),
      issuePage({ projectId: id, number, deps: deps() }),
    ),
});

// Registers a path's page once; the same path opens it.
function registrar(argo: Argo): Register {
  const registered = new Set<string>();

  return (path, page) => {
    if (!registered.has(path)) argo.pages.register(path, page);
    registered.add(path);

    return path;
  };
}

async function registerBuiltIns(deps: IssueDeps): Promise<void> {
  const projects = await deps.projects.known();

  for (const project of projects) {
    for (const filter of builtInFilters())
      deps.pages.filterPagePath(project, filter);
  }
}

type ProjectPageProps = {
  deps: IssueDeps;
  projectId: string;
  draw: (project: Project) => JSX.Element;
};

// A page keeps only its Project's id, and is drawn for the Project as it is now. The section's one list sits beside it.
function ProjectPage({ deps, projectId, draw }: ProjectPageProps): JSX.Element {
  const { project, message } = usePageProject(deps, projectId);

  return (
    <SignInGate account={github}>
      {project ? (
        draw(project)
      ) : (
        <Screen title="Issues">
          <EmptyState title={message} />
        </Screen>
      )}
    </SignInGate>
  );
}

type FilterInput = { projectId: string; filter: IssueFilter; deps: IssueDeps };

const filterPage = ({ projectId, filter, deps }: FilterInput): Page =>
  function IssueFilterPage(): JSX.Element {
    return (
      <ProjectPage
        deps={deps}
        projectId={projectId}
        draw={(project) => (
          <FilterPage project={project} filter={filter} deps={deps} />
        )}
      />
    );
  };

type IssueInput = { projectId: string; number: number; deps: IssueDeps };

const issuePage = ({ projectId, number, deps }: IssueInput): Page =>
  function IssuePage(): JSX.Element {
    return (
      <ProjectPage
        deps={deps}
        projectId={projectId}
        draw={(project) => (
          <IssueDetailPage project={project} number={number} deps={deps} />
        )}
      />
    );
  };
