import { EmptyState, Screen } from '@argo/plugin-kit';
import type { Argo, Page, PageParams } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { IssueDeps } from './issue-deps';
import { IssueDetailPage } from './issue-detail';
import { FilterPage } from './issue-filter-page';
import { builtInFilters, labelFilter, type IssueFilter } from './issue-filters';
import { fromPathSegment, pagePatterns } from './issue-paths';
import { IssuesRoot } from './issue-root';

/*
 * A Project's page, its filters' lists and its Issues are each registered once, at a pattern, so a link
 * opens its page however the App reached it: from a row, a reload or a link from outside the Plugin. A page
 * keeps only the Project's id; the Project itself, remote and all, is read each time the page opens.
 */
export function registerIssuePages(argo: Argo, deps: IssueDeps): void {
  argo.pages.register(pagePatterns.project, projectPage(deps));
  argo.pages.register(pagePatterns.filter, filterPage(deps));
  argo.pages.register(pagePatterns.issue, issuePage(deps));
}

const projectIdOf = (params: PageParams): string =>
  fromPathSegment(params.projectId ?? '');

const labelPrefix = 'label-';

// The filter a path names: a built-in one by its id, or a label by its name.
function filterOf(id: string): IssueFilter | undefined {
  const builtIn = builtInFilters().find((filter) => filter.id === id);

  if (builtIn) return builtIn;

  return id.startsWith(labelPrefix)
    ? labelFilter(fromPathSegment(id.slice(labelPrefix.length)))
    : undefined;
}

const issueNumberOf = (text: string): number | undefined =>
  /^[1-9]\d*$/u.test(text) ? Number(text) : undefined;

function NotFound(): JSX.Element {
  return (
    <Screen title="Not found">
      <EmptyState title="This page doesn't exist" />
    </Screen>
  );
}

const projectPage = (deps: IssueDeps): Page =>
  function IssueProjectPage(props: { params: PageParams }): JSX.Element {
    return <IssuesRoot deps={deps} projectId={projectIdOf(props.params)} />;
  };

const filterPage = (deps: IssueDeps): Page =>
  function IssueFilterPage(props: { params: PageParams }): JSX.Element {
    const filter = filterOf(props.params.filterId ?? '');

    if (!filter) return <NotFound />;

    return (
      <IssuesRoot
        deps={deps}
        projectId={projectIdOf(props.params)}
        filter={filter}
        detail={(project) => (
          <FilterPage project={project} filter={filter} deps={deps} />
        )}
      />
    );
  };

const issuePage = (deps: IssueDeps): Page =>
  function IssuePage(props: { params: PageParams }): JSX.Element {
    const number = issueNumberOf(props.params.number ?? '');

    if (number === undefined) return <NotFound />;

    return (
      <IssuesRoot
        deps={deps}
        projectId={projectIdOf(props.params)}
        detail={(project) => (
          <IssueDetailPage project={project} number={number} deps={deps} />
        )}
      />
    );
  };
