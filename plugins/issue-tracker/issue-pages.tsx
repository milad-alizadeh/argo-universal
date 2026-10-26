import type { Argo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Project } from './issue-client';
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
  projectPagePath: (project) =>
    register(projectPath(project.id), projectPage(project, deps())),
  filterPagePath: (project, filter) =>
    register(
      filterPath(project.id, filter),
      filterPage({ project, filter, deps: deps() }),
    ),
  issuePagePath: (project, number) =>
    register(
      issuePath(project.id, number),
      issuePage({ project, number, deps: deps() }),
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

const projectPage = (project: Project, deps: IssueDeps): Page =>
  function IssueProjectPage(): JSX.Element {
    return <IssuesRoot deps={deps} project={project} />;
  };

type FilterInput = { project: Project; filter: IssueFilter; deps: IssueDeps };

const filterPage = (source: FilterInput): Page =>
  function IssueFilterPage(): JSX.Element {
    return <IssuesRoot {...source} detail={<FilterPage {...source} />} />;
  };

type IssueInput = { project: Project; number: number; deps: IssueDeps };

const issuePage = (source: IssueInput): Page =>
  function IssuePage(): JSX.Element {
    return <IssuesRoot {...source} detail={<IssueDetailPage {...source} />} />;
  };
