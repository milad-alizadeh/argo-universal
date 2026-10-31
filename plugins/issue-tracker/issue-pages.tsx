import type { Argo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { IssueDeps, IssuePages } from './issue-deps';
import { IssueDetailPage } from './issue-detail';
import { FilterPage } from './issue-filter-page';
import { builtInFilters, type IssueFilter } from './issue-filters';
import { filterPath, issuePath, projectPath } from './issue-paths';
import { IssuesRoot } from './issue-root';

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
  projectPagePath: ({ id }) =>
    register(projectPath(id), projectPage(id, deps())),
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
  const projects = await deps.listProjects().catch(() => []);

  for (const project of projects) {
    deps.pages.projectPagePath(project);

    for (const filter of builtInFilters())
      deps.pages.filterPagePath(project, filter);
  }
}

// A page keeps only its Project's id: the Project itself, remote and all, is read each time the page opens.
const projectPage = (projectId: string, deps: IssueDeps): Page =>
  function IssueProjectPage(): JSX.Element {
    return <IssuesRoot deps={deps} projectId={projectId} />;
  };

type FilterInput = { projectId: string; filter: IssueFilter; deps: IssueDeps };

const filterPage = ({ projectId, filter, deps }: FilterInput): Page =>
  function IssueFilterPage(): JSX.Element {
    return (
      <IssuesRoot
        deps={deps}
        projectId={projectId}
        filter={filter}
        detail={(project) => (
          <FilterPage project={project} filter={filter} deps={deps} />
        )}
      />
    );
  };

type IssueInput = { projectId: string; number: number; deps: IssueDeps };

const issuePage = ({ projectId, number, deps }: IssueInput): Page =>
  function IssuePage(): JSX.Element {
    return (
      <IssuesRoot
        deps={deps}
        projectId={projectId}
        detail={(project) => (
          <IssueDetailPage project={project} number={number} deps={deps} />
        )}
      />
    );
  };
