import type { Argo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Project } from './issue-client';
import type { IssueDeps, IssuePages } from './issue-deps';
import { IssueDetailPage } from './issue-detail';
import { FilterPage } from './issue-filter-page';
import { builtInFilters, type IssueFilter } from './issue-filters';
import { appPath, filterPath, issuePath } from './issue-paths';

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
  const pages = hrefs(registrar(argo), () => deps);
  const deps: IssueDeps = { ...shared, pages };

  void registerBuiltIns(deps);

  return pages;
}

type Register = (path: string, page: Page) => string;

const hrefs = (register: Register, deps: () => IssueDeps): IssuePages => ({
  filterHref: (project, filter) =>
    register(
      filterPath(project.id, filter),
      filterPage({ project, filter, deps: deps() }),
    ),
  issueHref: (project, number) =>
    register(
      issuePath(project.id, number),
      issuePage({ project, number, deps: deps() }),
    ),
});

// Registers a path's page once, and answers its App path.
function registrar(argo: Argo): Register {
  const registered = new Set<string>();

  return (path, page) => {
    if (!registered.has(path)) argo.pages.register(path, page);
    registered.add(path);

    return appPath(path);
  };
}

async function registerBuiltIns(deps: IssueDeps): Promise<void> {
  const projects = await deps.listProjects().catch(() => []);

  for (const project of projects)
    for (const filter of builtInFilters())
      deps.pages.filterHref(project, filter);
}

type FilterInput = { project: Project; filter: IssueFilter; deps: IssueDeps };

const filterPage = (source: FilterInput): Page =>
  function IssueFilterPage(): JSX.Element {
    return <FilterPage {...source} />;
  };

type IssueInput = { project: Project; number: number; deps: IssueDeps };

const issuePage = (source: IssueInput): Page =>
  function IssuePage(): JSX.Element {
    return <IssueDetailPage {...source} />;
  };
